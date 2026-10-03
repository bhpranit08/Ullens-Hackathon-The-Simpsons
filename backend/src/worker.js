const crypto = require("node:crypto");
const Session = require("./models/Session");
const Contact = require("./models/Contact");
const User = require("./models/User");
const Device = require("./models/Device");
const Delivery = require("./models/Delivery");
const { overdue, cancelResolved } = require("./services/sessions");
const { config } = require("./config");
const timeout = () => AbortSignal.timeout(15000);
async function enqueueAlert(s) {
  if (!s.currentAlert) return;
  const alert = s.events.id(s.currentAlert),
    c = await Contact.findById(s.contact);
  if (!alert || c?.status !== "accepted" || !c.user) return;
  const [athlete, recipient, devices] = await Promise.all([
    User.findById(s.owner),
    User.findById(c.user),
    Device.find({ user: c.user }),
  ]);
  if (!recipient) return;
  const reason =
    alert.type === "sos"
      ? "SOS"
      : alert.type === "overdue_finish"
        ? "Overdue expected finish"
        : "Missed check-in";
  const p = alert.location;
  const message =
    athlete.name +
    " needs a safety response: " +
    reason +
    ". Activity: " +
    s.title +
    ". Alert time: " +
    alert.createdAt.toISOString() +
    ". Last known location: " +
    (p
      ? p.lat +
        ", " +
        p.lng +
        " (observed " +
        new Date(p.observedAt || alert.createdAt).toISOString() +
        ")"
      : "unavailable") +
    ". Open: " +
    config.webUrl +
    "/sessions/" +
    s.id;
  const jobs = [
    { channel: "email", to: recipient.email },
    ...devices.map((d) => ({ channel: "push", to: d.token })),
  ];
  for (const job of jobs) {
    const key = s.id + ":" + alert.id + ":" + job.channel + ":" + job.to;
    await Delivery.updateOne(
      { key },
      {
        $setOnInsert: {
          ...job,
          key,
          session: s.id,
          alert: alert._id,
          recipient: recipient._id,
          subject: "TrailGuard: " + reason,
          text: message,
          data: { sessionId: s.id, alertId: alert.id },
        },
      },
      { upsert: true },
    );
  }
}
async function send(job) {
  if (job.channel === "email") {
    if (config.mailMode === "preview") return { status: "preview" };
    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
      throw new Error(
        "Email delivery is not configured. Set RESEND_API_KEY and MAIL_FROM.",
      );
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: timeout(),
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto
          .createHash("sha256")
          .update(job.key)
          .digest("hex"),
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [job.to],
        subject: job.subject,
        text: job.text,
      }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Email provider rejected the request.");
    return { status: "accepted", providerId: data.id };
  }
  if (process.env.PUSH_ENABLED !== "true")
    throw new Error(
      "Push delivery is not configured. Enable PUSH_ENABLED after configuring your native app credentials.",
    );
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    signal: timeout(),
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: "Bearer " + process.env.EXPO_ACCESS_TOKEN }
        : {}),
    },
    body: JSON.stringify({
      to: job.to,
      sound: "default",
      title: job.subject,
      body: job.text,
      data: job.data,
    }),
  });
  const data = (await response.json()).data;
  if (!response.ok || data?.status !== "ok") {
    if (data?.details?.error === "DeviceNotRegistered")
      await Device.deleteOne({ token: job.to });
    throw new Error(data?.message || "Push provider rejected the request.");
  }
  return { status: "accepted", providerId: data.id };
}
async function deliverOne(sender = send) {
  const now = new Date(),
    leaseId = crypto.randomUUID();
  const job = await Delivery.findOneAndUpdate(
    {
      $or: [
        { status: "pending", nextAttemptAt: { $lte: now } },
        { status: "processing", leaseUntil: { $lt: now } },
      ],
    },
    {
      $set: {
        status: "processing",
        leaseId,
        leaseUntil: new Date(Date.now() + 60000),
      },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after", sort: { createdAt: 1 } },
  );
  if (!job) return false;
  const claim = { _id: job.id, status: "processing", leaseId };
  if (
    job.channel === "push" &&
    !(await Device.exists({ token: job.to, user: job.recipient }))
  ) {
    await Delivery.updateOne(claim, { status: "cancelled", leaseUntil: null });
    return true;
  }
  if (job.session) {
    const s = await Session.findById(job.session);
    if (
      !s ||
      String(s.currentAlert) !== String(job.alert) ||
      s.status === "completed"
    ) {
      await Delivery.updateOne(claim, {
        status: "cancelled",
        leaseUntil: null,
      });
      return true;
    }
  }
  try {
    const result = await sender(job);
    await Delivery.updateOne(claim, {
      ...result,
      error: null,
      leaseUntil: null,
    });
  } catch (error) {
    await Delivery.updateOne(claim, {
      status: job.attempts >= 5 ? "failed" : "pending",
      nextAttemptAt: new Date(
        Date.now() + Math.min(300000, 5000 * 2 ** job.attempts),
      ),
      leaseUntil: null,
      error: String(error.message).slice(0, 500),
    });
  }
  return true;
}
async function receipts() {
  const jobs = await Delivery.find({
    channel: "push",
    status: "accepted",
    updatedAt: { $lt: new Date(Date.now() - 15000) },
  }).limit(100);
  if (!jobs.length || process.env.PUSH_ENABLED !== "true") return;
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    signal: timeout(),
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: "Bearer " + process.env.EXPO_ACCESS_TOKEN }
        : {}),
    },
    body: JSON.stringify({ ids: jobs.map((j) => j.providerId) }),
  });
  if (!response.ok) throw new Error("Unable to read push receipts.");
  const { data } = await response.json();
  for (const job of jobs) {
    const receipt = data?.[job.providerId];
    if (!receipt) {
      if (Date.now() - +job.updatedAt > 24 * 3600000)
        await Delivery.updateOne(
          { _id: job.id },
          {
            status: "failed",
            error: "Push receipt unavailable after 24 hours.",
          },
        );
      continue;
    }
    if (receipt.details?.error === "DeviceNotRegistered")
      await Device.deleteOne({ token: job.to });
    await Delivery.updateOne(
      { _id: job.id },
      {
        status: receipt.status === "ok" ? "receipt_ok" : "failed",
        error: receipt.message,
      },
    );
  }
}
async function evaluateDeadlines() {
  const active = await Session.find({ status: { $ne: "completed" } }).select(
    "_id",
  );
  for (const item of active) {
    const s = await overdue(item.id);
    await cancelResolved(s);
    await enqueueAlert(s);
  }
}
async function processDeliveries(sender) {
  for (let i = 0; i < 20; i++) if (!(await deliverOne(sender))) break;
  if (!sender) await receipts();
}
async function tick(sender) {
  await evaluateDeadlines();
  await processDeliveries(sender);
}
function startWorker() {
  let deadlinesRunning = false,
    deliveryRunning = false;
  const runDeadlines = async () => {
    if (deadlinesRunning) return;
    deadlinesRunning = true;
    try {
      await evaluateDeadlines();
    } catch (e) {
      console.error("Deadline worker:", e.message);
    } finally {
      deadlinesRunning = false;
    }
  };
  const runDelivery = async () => {
    if (deliveryRunning) return;
    deliveryRunning = true;
    try {
      await processDeliveries();
    } catch (e) {
      console.error("Delivery worker:", e.message);
    } finally {
      deliveryRunning = false;
    }
  };
  const run = () => {
    void runDeadlines();
    void runDelivery();
  };
  run();
  const interval = setInterval(run, 5000);
  return () => clearInterval(interval);
}
module.exports = { tick, startWorker, deliverOne, enqueueAlert, send };
