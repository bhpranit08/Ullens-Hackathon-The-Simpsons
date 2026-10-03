const Hazard = require("../models/Hazard");
const v = require("../middleware/validate");
const categories = ["Traffic", "Road", "Weather", "Wildlife", "Other"];
const format = (h) => ({
  id: h.id,
  category: h.category,
  severity: h.severity,
  description: h.description,
  location: h.location,
  createdAt: h.createdAt,
});
exports.list = async (req, res) => {
  const query = {};
  if (req.query.category)
    query.category = v.choice(req.query.category, categories, "Category");
  if (req.query.recent) {
    v.choice(req.query.recent, ["24h", "7d", "30d"], "Recency");
    const days =
      req.query.recent === "24h" ? 1 : req.query.recent === "7d" ? 7 : 30;
    query.createdAt = { $gte: new Date(Date.now() - days * 86400000) };
  }
  res.json({
    hazards: (await Hazard.find(query).sort({ createdAt: -1 }).limit(300)).map(
      format,
    ),
  });
};
exports.create = async (req, res) => {
  const h = await Hazard.create({
    reporter: req.user.id,
    category: v.choice(req.body.category, categories, "Category"),
    severity: v.choice(
      req.body.severity,
      ["low", "medium", "high"],
      "Severity",
    ),
    description: v.text(req.body.description, "Description", 500),
    location: v.location(req.body.location, "browser"),
  });
  res.status(201).json({ hazard: format(h) });
};
