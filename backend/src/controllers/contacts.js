const Contact = require("../models/Contact");
const User = require("../models/User");
const Session = require("../models/Session");
const { text, email, id } = require("../middleware/validate");
const { fail } = require("../middleware/errors");
const { queueMail } = require("../services/mail");
const { config } = require("../config");
const format = (c) => ({
  id: c.id,
  name: c.user?.name || c.name || c.email,
  email: c.email,
  status: c.status,
  active: c.status === "accepted",
  owner: c.owner && {
    id: String(c.owner._id || c.owner),
    name: c.owner.name,
    email: c.owner.email,
  },
});
exports.list = async (req, res) => {
  const [contacts, invitations] = await Promise.all([
    Contact.find({ owner: req.user.id, status: { $ne: "removed" } })
      .populate("user", "name email")
      .populate("owner", "name email"),
    Contact.find({ email: req.user.email, status: "pending" }).populate(
      "owner",
      "name email",
    ),
  ]);
  res.json({
    contacts: contacts.map(format),
    invitations: invitations.map(format),
  });
};
exports.invite = async (req, res) => {
  const address = email(req.body.email),
    name = req.body.name ? text(req.body.name, "Contact name", 80) : "";
  if (address === req.user.email)
    fail(400, "Choose someone other than yourself.");
  const existing = await Contact.findOne({
    owner: req.user.id,
    email: address,
  });
  if (existing && ["pending", "accepted"].includes(existing.status))
    fail(409, "You have already invited this contact.");
  const user = await User.findOne({ email: address });
  const c = await Contact.findOneAndUpdate(
    { owner: req.user.id, email: address },
    { $set: { status: "pending", active: false, name, user: user?._id } },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  await queueMail(
    address,
    req.user.name + " invited you to TrailGuard",
    req.user.name +
      " would like you to be their trusted contact. Register or sign in to review and accept: " +
      config.webUrl +
      "/contacts",
    user?._id,
  );
  res.status(201).json({ contact: format(c) });
};
exports.respond = async (req, res) => {
  const c = await Contact.findById(id(req.params.id));
  if (!c) fail(404, "Invitation not found.");
  if (c.email !== req.user.email)
    fail(403, "This invitation is for another person.");
  const status = req.path.endsWith("/accept") ? "accepted" : "declined";
  if (c.status !== "pending" && c.status !== status)
    fail(409, "This invitation has already been resolved.");
  c.status = status;
  c.active = status === "accepted";
  c.user = req.user.id;
  await c.save();
  res.json({ contact: format(c) });
};
exports.remove = async (req, res) => {
  const c = await Contact.findById(id(req.params.id));
  if (!c) fail(404, "Contact not found.");
  if (String(c.owner) !== req.user.id && String(c.user) !== req.user.id)
    fail(403, "You cannot remove this contact.");
  if (await Session.exists({ contact: c.id, status: { $ne: "completed" } }))
    fail(409, "Finish the ongoing safety session before removing its contact.");
  c.status = "removed";
  c.active = false;
  await c.save();
  res.json({ success: true });
};
