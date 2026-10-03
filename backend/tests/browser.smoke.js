const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const mongoose = require("mongoose");
const { chromium } = require("playwright");
process.env.JWT_SECRET = "browser-test-secret-at-least-24-characters";
process.env.MAIL_MODE = "preview";
process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27017/trailguard_test_browser_" + process.pid;
const { connect } = require("../src/config");
const app = require("../src/app");
const { tick } = require("../src/worker");
const root = process.env.WEB_EXPORT_DIR || "/tmp/trailguard-web-rebuild";
let apiServer, webServer, browser;
const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
async function main() {
  await connect();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  apiServer = http.createServer(app);
  const apiPort = await listen(apiServer);
  webServer = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost"),
      relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    let file = path.resolve(root, relative || "index.html");
    if (
      !file.startsWith(root + "/") &&
      file !== path.join(root, "index.html")
    ) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = fs.existsSync(file + ".html")
        ? file + ".html"
        : path.join(root, "index.html");
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "application/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".html")
            ? "text/html"
            : "application/octet-stream",
    );
    fs.createReadStream(file).pipe(res);
  });
  const webPort = await listen(webServer),
    base = "http://127.0.0.1:" + webPort;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const errors = [];
  async function context() {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    // Use the real isolated API; redirect the exported app's development API address.
    await ctx.route("**/api/**", async (route) => {
      const u = new URL(route.request().url());
      const response = await route.fetch({
        url: "http://127.0.0.1:" + apiPort + u.pathname + u.search,
      });
      await route.fulfill({ response });
    });
    await ctx.route("https://*.tile.openstreetmap.org/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8f0e5"/></svg>',
      }),
    );
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    return page;
  }
  const athlete = await context(),
    contact = await context();
  await athlete.goto(base + "/");
  await athlete.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  async function signup(page, name, email) {
    await page.goto(base + "/register");
    await page
      .getByRole("textbox", { name: "Your name", exact: true })
      .fill(name);
    await page
      .getByRole("textbox", { name: "Email address", exact: true })
      .fill(email);
    await page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill("Password123!");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open local email preview", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use local verification link", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Continue to TrailGuard", exact: true })
      .click();
    await page.getByText("Hi, " + name + ".", { exact: true }).waitFor();
  }
  await signup(athlete, "Aarav", "browser-athlete@example.test");
  await athlete.goto(base + "/contacts");
  await athlete
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill("browser-contact@example.test");
  await athlete
    .getByRole("button", { name: "Send invitation", exact: true })
    .click();
  await athlete.getByText("PENDING", { exact: true }).waitFor();
  await signup(contact, "Rohan", "browser-contact@example.test");
  await contact.goto(base + "/contacts");
  await contact
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await athlete.reload();
  await athlete.getByText("ACCEPTED", { exact: true }).waitFor();
  await athlete.goto(base + "/sessions/new");
  await athlete
    .getByRole("textbox", { name: "Activity title / route area", exact: true })
    .fill("Browser test ride");
  await athlete
    .getByRole("radio", {
      name: "Rohan · browser-contact@example.test",
      exact: true,
    })
    .click();
  await athlete
    .getByRole("radio", { name: "Demo (simulated)", exact: true })
    .click();
  await athlete
    .getByRole("button", {
      name: "Agree to share location with my selected contact",
      exact: true,
    })
    .click();
  await athlete
    .getByRole("button", { name: "Start my activity", exact: true })
    .click();
  await athlete.waitForURL(/\/sessions\/[a-f\d]{24}$/);
  await athlete.reload();
  await athlete
    .getByRole("button", { name: "I am safe — check in", exact: true })
    .click();
  await athlete
    .getByRole("button", { name: "Demo: move to next location", exact: true })
    .click();
  await athlete.getByText("27.71820, 85.32500", { exact: true }).waitFor();
  await athlete
    .getByRole("button", { name: "Demo: miss check-in", exact: true })
    .click();
  await athlete.getByText("ALERTING", { exact: true }).waitFor();
  await tick(async () => ({ status: "preview" }));
  await contact.goto(base + "/");
  await contact
    .getByRole("button", { name: "View safety response", exact: true })
    .click();
  await contact
    .getByRole("button", { name: "Acknowledge — I am responding", exact: true })
    .click();
  await contact
    .getByRole("button", { name: "Alert acknowledged", exact: true })
    .waitFor();
  await athlete
    .getByRole("button", { name: "I am safe — check in", exact: true })
    .click();
  await athlete.getByText("ACTIVE", { exact: true }).waitFor();
  athlete.once("dialog", (dialog) => dialog.accept());
  await athlete
    .getByRole("button", { name: "Finish safely", exact: true })
    .click();
  await athlete.getByText("COMPLETED", { exact: true }).waitFor();
  await athlete.goto(base + "/history");
  await athlete.getByText("Browser test ride", { exact: true }).waitFor();
  await athlete.goto(base + "/hazards/new");
  await athlete
    .getByRole("textbox", { name: "What did you see?", exact: true })
    .fill("Loose gravel near the bridge");
  const map = athlete.locator(".leaflet-container");
  await map.waitFor();
  await map.click({ position: { x: 200, y: 150 } });
  await athlete
    .getByRole("button", { name: "Submit hazard report", exact: true })
    .click();
  await athlete
    .getByText("Loose gravel near the bridge", { exact: true })
    .waitFor();
  await athlete.getByRole("radio", { name: "Weather", exact: true }).click();
  await athlete
    .getByText("No reports match these filters.", { exact: true })
    .waitFor();
  // Exercise real browser geolocation APIs with a controlled test location.
  await athlete.context().grantPermissions(["geolocation"], { origin: base });
  await athlete
    .context()
    .setGeolocation({ latitude: 27.72, longitude: 85.33, accuracy: 12 });
  await athlete.goto(base + "/sessions/new");
  await athlete
    .getByRole("textbox", { name: "Activity title / route area", exact: true })
    .fill("Live browser ride");
  await athlete
    .getByRole("radio", {
      name: "Rohan · browser-contact@example.test",
      exact: true,
    })
    .click();
  await athlete
    .getByRole("button", {
      name: "Agree to share location with my selected contact",
      exact: true,
    })
    .click();
  await athlete
    .getByRole("button", { name: "Start my activity", exact: true })
    .click();
  await athlete.getByText("27.72000, 85.33000", { exact: true }).waitFor();
  const liveId = new URL(athlete.url()).pathname.split("/").at(-1);
  const session = await require("../src/models/Session").findById(liveId);
  assert.equal(session.trackingMode, "live");
  assert.equal(session.lastLocation.source, "browser");
  const offline = (route) => route.abort("connectionrefused");
  await athlete.context().route("**/api/sessions/*/check-in", offline);
  await athlete
    .getByRole("button", { name: "I am safe — check in", exact: true })
    .click();
  await athlete
    .getByText(
      "Cannot reach TrailGuard. Check your connection and API address.",
      { exact: true },
    )
    .waitFor();
  await athlete.context().unroute("**/api/sessions/*/check-in", offline);
  await athlete
    .getByRole("button", { name: "I am safe — check in", exact: true })
    .click();
  athlete.once("dialog", (dialog) => dialog.accept());
  await athlete
    .getByRole("button", { name: "Finish safely", exact: true })
    .click();
  await athlete.getByText("COMPLETED", { exact: true }).waitFor();
  assert.equal(
    await athlete.evaluate(() =>
      localStorage.getItem("trailguard.pending-locations"),
    ),
    null,
  );
  await athlete.setViewportSize({ width: 390, height: 844 });
  await athlete.goto(base + "/profile");
  await athlete.getByText("Your safety settings", { exact: true }).waitFor();
  const overflow = await athlete.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  assert.equal(
    overflow,
    false,
    "Mobile layout should not overflow horizontally",
  );
  await athlete.screenshot({
    path: "/tmp/trailguard-profile-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(
    errors,
    [],
    "Browser must not produce unhandled runtime errors",
  );
  console.log(
    "PASS: browser registration/verification, consent invitation, safety actions, response, history, custom hazard/filter, live geolocation fixture, API failure/recovery, tracking cleanup, mobile layout, no runtime errors.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    for (const server of [apiServer, webServer])
      if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.name === "trailguard_test_browser_" + process.pid)
      await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
