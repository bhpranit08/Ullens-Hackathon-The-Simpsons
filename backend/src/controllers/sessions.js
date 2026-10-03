const Session = require("../models/Session");
const Contact = require("../models/Contact");
const service = require("../services/sessions");
const { fail } = require("../middleware/errors");
exports.list = async (req, res) => {
  const contacts = await Contact.find({
    user: req.user.id,
    status: "accepted",
  }).select("_id");
  const sessions = await Session.find({
    $or: [
      { owner: req.user.id },
      { contact: { $in: contacts.map((c) => c._id) } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100);
  const refreshed = await Promise.all(
    sessions.map((s) => service.overdue(s.id)),
  );
  res.json({
    sessions: await Promise.all(refreshed.map((s) => service.detail(s, false))),
  });
};
exports.create = async (req, res) =>
  res.status(201).json({
    session: await service.detail(await service.create(req.user, req.body)),
  });
exports.get = async (req, res) => {
  await service.authorized(req.params.id, req.user);
  res.json({
    session: await service.detail(await service.overdue(req.params.id)),
  });
};
exports.action = (action) => async (req, res) => {
  const s =
    action === "acknowledge"
      ? await service.acknowledge(req.params.id, req.user)
      : await service.act(req.params.id, req.user, action);
  res.json({ session: await service.detail(s) });
};
exports.location = async (req, res) =>
  res.json({
    session: await service.detail(
      await service.upload(req.params.id, req.user, req.body),
    ),
  });
exports.extend = async (req, res) => {
  const { session } = await service.authorized(req.params.id, req.user);
  if (String(session.owner) !== req.user.id)
    fail(403, "Only the athlete can extend a session.");
  const end = new Date(req.body.expectedEndTime);
  if (!Number.isFinite(+end) || +end <= Date.now())
    fail(400, "Choose a future finish time.");
  const s = await service.transition(session.id, req.user.id, (current) => {
    if (current.status === "completed")
      fail(409, "This safety session is completed.");
    return {
      $set: { expectedEndTime: end },
      $push: {
        events: service.sessionEvent(
          "finish_extended",
          req.user.id,
          current.lastLocation,
        ),
      },
    };
  });
  res.json({ session: await service.detail(s) });
};
