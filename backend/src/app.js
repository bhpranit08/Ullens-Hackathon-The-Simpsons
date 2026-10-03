const express = require("express");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errors");
const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "128kb" }));
app.get("/api/health", (_req, res) =>
  res.json({ success: true, message: "TrailGuard API is running" }),
);
for (const domain of [
  "auth",
  "contacts",
  "sessions",
  "hazards",
  "notifications",
])
  app.use("/api/" + domain, require("./routes/" + domain));
app.use(notFound);
app.use(errorHandler);
module.exports = app;
