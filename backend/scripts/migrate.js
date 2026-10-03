require("dotenv").config();
const mongoose = require("mongoose");
const { connect } = require("../src/config");
const User = require("../src/models/User"),
  Contact = require("../src/models/Contact"),
  Session = require("../src/models/Session");
async function migrate() {
  await User.updateMany(
    { tokenVersion: { $exists: false } },
    { $set: { tokenVersion: 0, verified: false } },
  );
  await Contact.updateMany(
    { status: { $exists: false } },
    { $set: { status: "pending", active: false } },
  );
  const oldEvents = mongoose.connection.collection("events");
  const sessions = await Session.find({ migrationVersion: { $ne: 1 } }).sort({
    createdAt: -1,
  });
  const migrated = await Session.find({
    migrationVersion: 1,
    status: { $ne: "completed" },
  }).select("owner");
  const seen = new Set(migrated.map((s) => String(s.owner)));
  for (const s of sessions) {
    const previous = await oldEvents
      .find({ session: s._id })
      .sort({ createdAt: 1 })
      .toArray();
    if (previous.length && !s.events.length)
      s.events = previous.map((e) => ({
        _id: e._id,
        type: e.type,
        actor: e.actor,
        createdAt: e.createdAt,
        location: {
          ...e.location,
          source: "simulated",
          observedAt: e.createdAt,
        },
        acknowledged: !!e.acknowledged,
      }));
    s.trackingMode ||= "demo";
    s.revision ||= 0;
    if (s.lastLocation && !s.lastLocation.source) {
      s.lastLocation.source = "simulated";
      s.lastLocation.observedAt = s.updatedAt;
    }
    const owner = String(s.owner);
    if (s.status !== "completed" && seen.has(owner)) {
      s.status = "completed";
      s.completedAt = new Date();
      s.events.push({
        type: "migration_closed_duplicate",
        createdAt: new Date(),
        location: s.lastLocation,
      });
    }
    s.unfinished = s.status !== "completed";
    if (s.unfinished) seen.add(owner);
    if (["alerting", "sos"].includes(s.status))
      s.currentAlert = s.events
        .filter((e) =>
          ["missed_check_in", "sos", "overdue_finish"].includes(e.type),
        )
        .at(-1)?._id;
    s.migrationVersion = 1;
    await s.save();
  }
  await Promise.all([
    User.createIndexes(),
    Contact.createIndexes(),
    Session.createIndexes(),
  ]);
  console.log(
    "Migration complete. Accounts/history preserved; legacy contacts need acceptance. Older duplicate unfinished sessions were closed with migration events.",
  );
}
module.exports = { migrate };
if (require.main === module)
  connect()
    .then(migrate)
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
