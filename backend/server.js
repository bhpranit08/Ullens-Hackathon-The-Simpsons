require("dotenv").config();
const mongoose = require("mongoose");
const { config, connect } = require("./src/config");
async function main() {
  await connect();
  const app = require("./src/app");
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
  const server = app.listen(config.port, "0.0.0.0", () =>
    console.log("TrailGuard API on port " + config.port),
  );
  const stopWorker =
    process.env.RUN_WORKER !== "false"
      ? require("./src/worker").startWorker()
      : () => {};
  server.on("error", async (error) => {
    console.error("API startup failed:", error.message);
    stopWorker();
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  async function shutdown() {
    stopWorker();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
