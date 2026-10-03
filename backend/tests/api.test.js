const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
process.env.JWT_SECRET = "integration-only-secret-with-more-than-24-characters";
process.env.MAIL_MODE = "preview";
process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27017/trailguard_test_" + process.pid;
const { connect } = require("../src/config");
const app = require("../src/app");
const Session = require("../src/models/Session"),
  Contact = require("../src/models/Contact"),
  Delivery = require("../src/models/Delivery"),
  LocationPing = require("../src/models/LocationPing");
const { tick, deliverOne, enqueueAlert } = require("../src/worker");
const { migrate } = require("../scripts/migrate");
const Device = require("../src/models/Device");
let server, base;
async function api(path, body, token, method) {
  const response = await fetch(base + path, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
async function register(name, email) {
  const r = await api("/auth/register", {
    name,
    email,
    password: "Password123!",
  });
  assert.equal(r.status, 201);
  return r.body;
}
async function verify(account) {
  const mail = await Delivery.findOne({
    to: account.user.email,
    subject: "Verify your TrailGuard email",
  }).sort({ createdAt: -1 });
  const result = await api("/auth/verify", {
    token: mail.text.split("token=")[1],
  });
  assert.equal(result.status, 200);
}
before(async () => {
  await connect();
  await Promise.all([
    Session.init(),
    Contact.init(),
    Delivery.init(),
    LocationPing.init(),
    require("../src/models/User").init(),
    require("../src/models/Device").init(),
  ]);
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = "http://127.0.0.1:" + server.address().port + "/api";
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  // Only this process's freshly created test database is ever dropped.
  if (mongoose.connection.name === "trailguard_test_" + process.pid)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
test("complete two-account journey, access controls and resilient worker", async (t) => {
  const athlete = await register("Aarav", "aarav@example.test"),
    contact = await register("Rohan", "rohan@example.test"),
    other = await register("Other", "other@example.test");
  await t.test(
    "authentication, validation and email verification",
    async () => {
      assert.equal((await api("/sessions")).status, 401);
      assert.equal(
        (
          await api("/auth/login", {
            email: athlete.user.email,
            password: "wrong",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await api("/auth/register", {
            name: "Repeat",
            email: athlete.user.email,
            password: "Password123!",
          })
        ).status,
        409,
      );
      assert.equal(
        (await api("/auth/register", { name: 5, email: 5, password: [] }))
          .status,
        400,
      );
      assert.equal(
        (await api("/contacts", { email: contact.user.email }, athlete.token))
          .status,
        403,
      );
      await verify(athlete);
      await verify(contact);
      await verify(other);
      const me = await api("/auth/me", undefined, athlete.token);
      assert.equal(me.body.user.verified, true);
      assert.equal(me.body.user.passwordHash, undefined);
      assert.equal(
        (await api("/auth/verify", { token: "expired" })).status,
        400,
      );
    },
  );
  let c;
  await t.test(
    "invitations require explicit consent and valid ownership",
    async () => {
      assert.equal(
        (await api("/contacts", { email: athlete.user.email }, athlete.token))
          .status,
        400,
      );
      const invitation = await api(
        "/contacts",
        { email: contact.user.email },
        athlete.token,
      );
      assert.equal(invitation.status, 201);
      c = invitation.body.contact;
      assert.equal(c.status, "pending");
      assert.equal(
        (await api("/contacts", { email: contact.user.email }, athlete.token))
          .status,
        409,
      );
      assert.equal(
        (await api("/contacts/" + c.id + "/accept", {}, other.token)).status,
        403,
      );
      assert.equal(
        (await api("/contacts", undefined, contact.token)).body.invitations
          .length,
        1,
      );
      assert.equal(
        (await api("/contacts/" + c.id + "/accept", {}, contact.token)).status,
        200,
      );
    },
  );
  const body = () => ({
    activityType: "Cycling",
    title: "Kathmandu ride",
    trackingMode: "demo",
    sharingConsent: true,
    contactId: c.id,
    expectedEndTime: new Date(Date.now() + 7200000).toISOString(),
    checkInMinutes: 15,
  });
  let session;
  await t.test(
    "create, validate and enforce a single unfinished session",
    async () => {
      assert.equal(
        (
          await api(
            "/sessions",
            { ...body(), checkInMinutes: 0 },
            athlete.token,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await api(
            "/sessions",
            { ...body(), contactId: "bad-id" },
            athlete.token,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await api(
            "/sessions",
            { ...body(), sharingConsent: false },
            athlete.token,
          )
        ).status,
        400,
      );
      const created = await api("/sessions", body(), athlete.token);
      assert.equal(created.status, 201);
      session = created.body.session;
      assert.equal((await api("/sessions", body(), athlete.token)).status, 409);
      assert.equal(
        (await api("/sessions/" + session.id, undefined, other.token)).status,
        403,
      );
      assert.equal(
        (await api("/sessions/not-an-id", undefined, athlete.token)).status,
        400,
      );
      assert.equal(
        (await api("/sessions/" + session.id + "/check-in", {}, contact.token))
          .status,
        403,
      );
      assert.equal(
        (await api("/contacts/" + c.id, undefined, athlete.token, "DELETE"))
          .status,
        409,
      );
    },
  );
  await t.test("check-ins are idempotent and renew deadlines", async () => {
    const checks = await Promise.all([
      api("/sessions/" + session.id + "/check-in", {}, athlete.token),
      api("/sessions/" + session.id + "/check-in", {}, athlete.token),
    ]);
    assert.ok(checks.every((r) => r.status === 200));
    const doc = await Session.findById(session.id);
    assert.equal(doc.events.filter((e) => e.type === "check_in").length, 1);
    assert.ok(+doc.nextCheckInDue > Date.now());
  });
  await t.test(
    "location history is deduplicated and old uploads cannot replace the latest",
    async () => {
      const newest = {
        lat: 27.72,
        lng: 85.33,
        source: "simulated",
        pingId: "new",
        observedAt: new Date().toISOString(),
        accuracy: 10,
      };
      const oldest = {
        ...newest,
        lat: 27.7,
        pingId: "old",
        observedAt: new Date(Date.now() - 30000).toISOString(),
      };
      assert.equal(
        (
          await api(
            "/sessions/" + session.id + "/location",
            { location: newest },
            athlete.token,
          )
        ).status,
        200,
      );
      await api(
        "/sessions/" + session.id + "/location",
        { location: newest },
        athlete.token,
      );
      await api(
        "/sessions/" + session.id + "/location",
        { location: oldest },
        athlete.token,
      );
      const doc = await Session.findById(session.id);
      assert.equal(doc.lastLocation.lat, newest.lat);
      assert.equal(
        await LocationPing.countDocuments({ session: session.id }),
        2,
      );
      assert.equal(
        (
          await api(
            "/sessions/" + session.id + "/location",
            { location: { ...newest, lat: 1000 } },
            athlete.token,
          )
        ).status,
        400,
      );
    },
  );
  await t.test(
    "worker detects deadlines without an open app and records one alert under concurrent polls",
    async () => {
      await Session.updateOne(
        { _id: session.id },
        { nextCheckInDue: new Date(Date.now() - 1000) },
      );
      await Promise.all([
        tick(async () => ({ status: "accepted", providerId: "fake" })),
        api("/sessions/" + session.id, undefined, athlete.token),
      ]);
      const doc = await Session.findById(session.id);
      assert.equal(doc.status, "alerting");
      assert.equal(
        doc.events.filter((e) => e.type === "missed_check_in").length,
        1,
      );
      assert.equal(
        await Delivery.countDocuments({ session: doc.id, channel: "email" }),
        1,
      );
      assert.equal(
        (await api("/sessions/" + doc.id + "/acknowledge", {}, athlete.token))
          .status,
        403,
      );
      assert.equal(
        (await api("/sessions/" + doc.id + "/acknowledge", {}, contact.token))
          .status,
        200,
      );
      await api("/sessions/" + doc.id + "/acknowledge", {}, contact.token);
      const ack = await Session.findById(doc.id);
      assert.equal(ack.status, "alerting");
      assert.equal(ack.events.id(ack.currentAlert).acknowledged, true);
    },
  );
  await t.test(
    "SOS is idempotent, resolved alerts cancel unsent delivery, completion is terminal",
    async () => {
      await api("/sessions/" + session.id + "/sos", {}, athlete.token);
      await api("/sessions/" + session.id + "/sos", {}, athlete.token);
      let doc = await Session.findById(session.id);
      assert.equal(doc.status, "sos");
      assert.equal(doc.events.filter((e) => e.type === "sos").length, 1);
      await enqueueAlert(doc);
      assert.equal(
        (await api("/sessions/" + doc.id + "/check-in", {}, athlete.token))
          .status,
        200,
      );
      assert.equal(
        (await Delivery.findOne({ session: doc.id, alert: doc.currentAlert }))
          .status,
        "cancelled",
      );
      await api("/sessions/" + doc.id + "/complete", {}, athlete.token);
      await api("/sessions/" + doc.id + "/complete", {}, athlete.token);
      doc = await Session.findById(doc.id);
      assert.equal(doc.events.filter((e) => e.type === "completed").length, 1);
      for (const action of ["check-in", "sos", "simulate-miss"])
        assert.equal(
          (await api("/sessions/" + doc.id + "/" + action, {}, athlete.token))
            .status,
          409,
        );
    },
  );
  await t.test("overdue expected finish survives worker restart", async () => {
    const created = await api("/sessions", body(), athlete.token);
    await Session.updateOne(
      { _id: created.body.session.id },
      { expectedEndTime: new Date(Date.now() - 1000) },
    );
    await tick(async () => ({ status: "accepted" }));
    const doc = await Session.findById(created.body.session.id);
    assert.equal(doc.status, "alerting");
    assert.equal(doc.events.at(-1).type, "overdue_finish");
    await tick(async () => ({ status: "accepted" }));
    assert.equal(await Delivery.countDocuments({ session: doc.id }), 1);
    await api("/sessions/" + doc.id + "/complete", {}, athlete.token);
  });
  await t.test(
    "notification jobs retry boundedly and recover expired leases",
    async () => {
      await Delivery.updateMany({ status: "pending" }, { status: "preview" });
      const job = await Delivery.create({
        key: "retry-test",
        channel: "email",
        to: "test@example.test",
        status: "processing",
        leaseUntil: new Date(Date.now() - 1),
      });
      for (let i = 0; i < 5; i++) {
        await Delivery.updateOne(
          { _id: job.id },
          { nextAttemptAt: new Date(0) },
        );
        assert.equal(
          await deliverOne(async () => {
            throw new Error("Provider down");
          }),
          true,
        );
      }
      const failed = await Delivery.findById(job.id);
      assert.equal(failed.status, "failed");
      assert.equal(failed.attempts, 5);
    },
  );
  await t.test("hazards validate and filter category/recency", async () => {
    const h = {
      category: "Road",
      severity: "high",
      description: "Broken pavement",
      location: { lat: 27.7, lng: 85.3 },
    };
    assert.equal((await api("/hazards", h, athlete.token)).status, 201);
    assert.equal(
      (await api("/hazards", { ...h, category: "Invalid" }, athlete.token))
        .status,
      400,
    );
    assert.equal(
      (await api("/hazards?category=Road&recent=7d", undefined, contact.token))
        .body.hazards.length,
      1,
    );
    assert.equal(
      (await api("/hazards?category=Weather", undefined, contact.token)).body
        .hazards.length,
      0,
    );
    assert.equal(
      (await api("/hazards?recent=bad", undefined, contact.token)).status,
      400,
    );
  });
  await t.test(
    "push jobs are cancelled after the recipient unregisters their device",
    async () => {
      await Delivery.updateMany({ status: "pending" }, { status: "preview" });
      const token = "ExpoPushToken[test-device-123]";
      assert.equal(
        (
          await api(
            "/notifications/devices",
            { token, platform: "android" },
            contact.token,
          )
        ).status,
        200,
      );
      const device = await Device.findOne({ token });
      const job = await Delivery.create({
        key: "removed-push-test",
        channel: "push",
        to: token,
        recipient: device.user,
      });
      assert.equal(
        (
          await api(
            "/notifications/devices",
            { token },
            contact.token,
            "DELETE",
          )
        ).status,
        200,
      );
      await deliverOne(async () => {
        throw new Error("Removed device must not be called");
      });
      assert.equal((await Delivery.findById(job.id)).status, "cancelled");
    },
  );
  await t.test(
    "migration preserves legacy users and events, and requires renewed consent",
    async () => {
      const ownerId = new mongoose.Types.ObjectId(),
        contactId = new mongoose.Types.ObjectId(),
        sessionId = new mongoose.Types.ObjectId(),
        eventId = new mongoose.Types.ObjectId();
      await mongoose.connection
        .collection("users")
        .insertOne({
          _id: ownerId,
          name: "Legacy",
          email: "legacy@example.test",
          passwordHash: "preserved-hash",
        });
      await mongoose.connection
        .collection("contacts")
        .insertOne({
          _id: contactId,
          owner: ownerId,
          email: "legacy-contact@example.test",
          active: true,
        });
      await mongoose.connection
        .collection("sessions")
        .insertOne({
          _id: sessionId,
          owner: ownerId,
          contact: contactId,
          activityType: "Cycling",
          title: "Legacy ride",
          status: "completed",
          expectedEndTime: new Date(),
          nextCheckInDue: new Date(),
          checkInMinutes: 15,
          lastLocation: { lat: 27.7, lng: 85.3 },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      await mongoose.connection
        .collection("events")
        .insertOne({
          _id: eventId,
          session: sessionId,
          type: "completed",
          createdAt: new Date(),
          location: { lat: 27.7, lng: 85.3 },
        });
      await migrate();
      await migrate();
      const owner = await mongoose.connection
          .collection("users")
          .findOne({ _id: ownerId }),
        c = await Contact.findById(contactId),
        s = await Session.findById(sessionId);
      assert.equal(owner.passwordHash, "preserved-hash");
      assert.equal(owner.tokenVersion, 0);
      assert.equal(c.status, "pending");
      assert.equal(c.active, false);
      assert.equal(s.trackingMode, "demo");
      assert.equal(s.lastLocation.source, "simulated");
      assert.equal(s.events.length, 1);
      assert.equal(s.events[0].id, String(eventId));
    },
  );
  await t.test("password reset and logout invalidate credentials", async () => {
    await api("/auth/forgot-password", { email: other.user.email });
    const mail = await Delivery.findOne({
      to: other.user.email,
      subject: "Reset your TrailGuard password",
    });
    assert.equal(
      (
        await api("/auth/reset-password", {
          token: mail.text.split("token=")[1],
          password: "NewPassword123!",
        })
      ).status,
      200,
    );
    assert.equal((await api("/auth/me", undefined, other.token)).status, 401);
    assert.equal(
      (
        await api("/auth/login", {
          email: other.user.email,
          password: "NewPassword123!",
        })
      ).status,
      200,
    );
    await api("/auth/logout", {}, contact.token);
    assert.equal((await api("/auth/me", undefined, contact.token)).status, 401);
  });
});
