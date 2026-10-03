require("dotenv").config();
const mongoose = require("mongoose");
const { connect } = require("./src/config");
connect()
  .then(async () => {
    const worker = require("./src/worker");
    await Promise.all(
      Object.values(mongoose.models).map((model) => model.init()),
    );
    const stop = worker.startWorker();
    const shutdown = async () => {
      stop();
      await mongoose.disconnect();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    console.log("TrailGuard alert worker running every five seconds.");
  })
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
