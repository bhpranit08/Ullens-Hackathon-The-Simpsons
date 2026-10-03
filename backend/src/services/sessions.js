const mongoose = require("mongoose");
const Session = require("../models/Session");
const Contact = require("../models/Contact");
const User = require("../models/User");
const LocationPing = require("../models/LocationPing");
const Delivery = require("../models/Delivery");
const { fail } = require("../middleware/errors");
const v = require("../middleware/validate");
const { publicUser } = require("../controllers/auth");
function sessionEvent(type, actor, location) {
  return {
    _id: new mongoose.Types.ObjectId(),
    type,
    actor,
    location,
    createdAt: new Date(),
  };
}
async function authorized(sessionId, user) {
  const s = await Session.findById(v.id(sessionId));
  if (!s) fail(404, "Safety session not found.");
  const c = await Contact.findById(s.contact);
  if (
    String(s.owner) !== user.id &&
    !(c?.status === "accepted" && String(c.user) === user.id)
  )
    fail(403, "You cannot access this safety session.");
  return { session: s, contact: c };
}
async function transition(sessionId, actor, build) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = await Session.findById(sessionId);
    if (!s) fail(404, "Safety session not found.");
    const update = build(s);
    if (!update) return s;
    update.$inc = { revision: 1 };
    const changed = await Session.findOneAndUpdate(
      { _id: s.id, revision: s.revision },
      update,
      { returnDocument: "after", runValidators: true },
    );
    if (changed) return changed;
  }
  fail(409, "The session changed. Please try again.");
}
async function overdue(sessionId) {
  return transition(sessionId, null, (s) => {
    if (s.status !== "active") return null;
    const now = Date.now(),
      finish = +s.expectedEndTime <= now,
      missed = +s.nextCheckInDue <= now;
    if (!finish && !missed) return null;
    const e = sessionEvent(
      finish ? "overdue_finish" : "missed_check_in",
      null,
      s.lastLocation,
    );
    return {
      $set: { status: "alerting", currentAlert: e._id },
      $push: { events: e },
    };
  });
}
async function cancelResolved(s) {
  await Delivery.updateMany(
    {
      session: s._id,
      alert: { $ne: s.currentAlert || null },
      status: { $in: ["pending", "processing"] },
    },
    { status: "cancelled" },
  );
}
async function act(sessionId, user, action) {
  const { session } = await authorized(sessionId, user);
  if (String(session.owner) !== user.id)
    fail(403, "Only the athlete can do that.");
  const s = await transition(sessionId, user.id, (current) => {
    if (current.status === "completed") {
      if (action === "complete") return null;
      fail(409, "This safety session is completed.");
    }
    if (action === "simulate-miss") {
      if (current.trackingMode !== "demo")
        fail(403, "Simulation controls are available only in demo sessions.");
      if (current.status !== "active") return null;
      const e = sessionEvent("missed_check_in", user.id, current.lastLocation);
      return {
        $set: {
          status: "alerting",
          currentAlert: e._id,
          nextCheckInDue: new Date(Date.now() - 1),
        },
        $push: { events: e },
      };
    }
    if (action === "sos") {
      if (current.status === "sos") return null;
      const e = sessionEvent("sos", user.id, current.lastLocation);
      return {
        $set: { status: "sos", currentAlert: e._id },
        $push: { events: e },
      };
    }
    if (action === "complete")
      return {
        $set: {
          status: "completed",
          unfinished: false,
          currentAlert: null,
          completedAt: new Date(),
        },
        $push: {
          events: sessionEvent("completed", user.id, current.lastLocation),
        },
      };
    if (action === "check-in") {
      if (
        current.status === "active" &&
        Date.now() -
          +(
            current.events.filter((e) => e.type === "check_in").at(-1)
              ?.createdAt || 0
          ) <
          3000
      )
        return null;
      if (+current.expectedEndTime <= Date.now())
        fail(
          409,
          "Expected finish has passed. Extend your finish time or finish safely.",
        );
      return {
        $set: {
          status: "active",
          currentAlert: null,
          nextCheckInDue: new Date(Date.now() + current.checkInMinutes * 60000),
        },
        $push: {
          events: sessionEvent("check_in", user.id, current.lastLocation),
        },
      };
    }
    fail(400, "Unknown session action.");
  });
  await cancelResolved(s);
  return s;
}
async function acknowledge(sessionId, user) {
  const { session, contact } = await authorized(sessionId, user);
  if (String(contact?.user) !== user.id)
    fail(403, "Only the trusted contact can acknowledge.");
  if (!session.currentAlert) fail(409, "There is no active alert.");
  await Session.updateOne(
    { _id: session.id, currentAlert: session.currentAlert },
    {
      $set: {
        "events.$[alert].acknowledged": true,
        "events.$[alert].acknowledgedAt": new Date(),
      },
    },
    {
      arrayFilters: [
        {
          "alert._id": session.currentAlert,
          "alert.acknowledged": { $ne: true },
        },
      ],
    },
  );
  return Session.findById(session.id);
}
async function create(user, body) {
  const activityType = v.choice(
      body.activityType,
      ["Cycling", "Running", "Trekking"],
      "Activity",
    ),
    title = v.text(body.title, "Route title");
  const trackingMode = v.choice(
      body.trackingMode,
      ["live", "demo"],
      "Tracking mode",
    ),
    minutes = body.checkInMinutes;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)
    fail(400, "Choose a check-in interval between 1 and 240 minutes.");
  const end = new Date(body.expectedEndTime);
  if (!Number.isFinite(+end) || +end <= Date.now())
    fail(400, "Expected finish must be in the future.");
  if (body.sharingConsent !== true)
    fail(400, "Confirm location sharing with your contact.");
  const c = await Contact.findOne({
    _id: v.id(body.contactId),
    owner: user.id,
    status: "accepted",
  });
  if (!c) fail(400, "Choose an accepted trusted contact.");
  const initial =
    trackingMode === "demo"
      ? v.location({ lat: 27.7172, lng: 85.324 }, "simulated")
      : v.location(body.location);
  if (trackingMode === "live" && initial.source === "simulated")
    fail(400, "Live sessions require a real device location.");
  return Session.create({
    owner: user.id,
    contact: c.id,
    title,
    activityType,
    trackingMode,
    expectedEndTime: end,
    checkInMinutes: minutes,
    nextCheckInDue: new Date(Date.now() + minutes * 60000),
    lastLocation: initial,
    events: [sessionEvent("started", user.id, initial)],
  });
}
async function upload(sessionId, user, body) {
  const { session } = await authorized(sessionId, user);
  if (String(session.owner) !== user.id)
    fail(403, "Only the athlete can share location.");
  if (session.status === "completed")
    fail(409, "This safety session is completed.");
  const p = v.location(body.location);
  const pingId = v.text(body.location?.pingId, "Location identifier", 100);
  if ((session.trackingMode === "demo") !== (p.source === "simulated"))
    fail(400, "Location source does not match the session mode.");
  const stored = await LocationPing.findOneAndUpdate(
    { session: session.id, pingId },
    { $setOnInsert: { location: p } },
    { upsert: true, returnDocument: "after" },
  );
  const canonical = stored.location;
  await Session.updateOne(
    {
      _id: session.id,
      status: { $ne: "completed" },
      $or: [
        { "lastLocation.observedAt": { $lt: canonical.observedAt } },
        { "lastLocation.observedAt": { $exists: false } },
      ],
    },
    { $set: { lastLocation: canonical }, $inc: { revision: 1 } },
  );
  return Session.findById(session.id);
}
async function detail(s, full = true) {
  const [owner, c, pings, deliveries] = await Promise.all([
    User.findById(s.owner),
    Contact.findById(s.contact).populate("user", "name email"),
    full
      ? LocationPing.find({ session: s.id })
          .sort({ "location.observedAt": -1 })
          .limit(500)
      : [],
    full
      ? Delivery.find({ session: s.id }).select(
          "channel status error createdAt",
        )
      : [],
  ]);
  return {
    id: s.id,
    owner: owner && publicUser(owner),
    contact: c && {
      id: c.id,
      name: c.user?.name || c.name || c.email,
      email: c.email,
      status: c.status,
    },
    title: s.title,
    activityType: s.activityType,
    status: s.status,
    trackingMode: s.trackingMode,
    expectedEndTime: s.expectedEndTime,
    checkInMinutes: s.checkInMinutes,
    nextCheckInDue: s.nextCheckInDue,
    lastLocation: s.lastLocation,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
    currentAlert: s.currentAlert,
    events: (full ? s.events : []).map((e) => ({
      id: e.id,
      type: e.type,
      actor: e.actor,
      location: e.location,
      createdAt: e.createdAt,
      acknowledged: e.acknowledged,
      acknowledgedAt: e.acknowledgedAt,
    })),
    locations: full
      ? [
          s.events.find((e) => e.type === "started")?.location,
          ...pings.reverse().map((p) => p.location),
        ].filter(Boolean)
      : [],
    deliveries: deliveries.map((d) => ({
      id: d.id,
      channel: d.channel,
      status: d.status,
      error: d.error,
    })),
  };
}
module.exports = {
  authorized,
  transition,
  overdue,
  act,
  acknowledge,
  create,
  upload,
  detail,
  sessionEvent,
  cancelResolved,
};
