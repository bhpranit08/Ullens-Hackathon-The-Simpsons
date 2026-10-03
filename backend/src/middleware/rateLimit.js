const { fail } = require("./errors");
const buckets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, v] of buckets) if (v.until < now) buckets.delete(key);
}, 60000).unref();
// ponytail: process-local limiter; move to a shared store when deploying multiple API instances.
module.exports = function rateLimit(limit, windowMs = 15 * 60000) {
  return (req, _res, next) => {
    const key = req.ip + ":" + req.baseUrl + ":" + req.path;
    let bucket = buckets.get(key);
    if (!bucket || bucket.until < Date.now()) {
      bucket = { count: 0, until: Date.now() + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > limit)
      fail(429, "Too many requests. Please try again later.");
    next();
  };
};
