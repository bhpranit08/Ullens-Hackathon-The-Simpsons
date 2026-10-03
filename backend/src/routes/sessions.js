const router = require("express").Router();
const c = require("../controllers/sessions"),
  { auth, verified } = require("../middleware/auth");
router.use(auth);
router.get("/", c.list);
router.post("/", verified, c.create);
router.get("/:id", c.get);
for (const action of [
  "check-in",
  "sos",
  "complete",
  "simulate-miss",
  "acknowledge",
])
  router.post("/:id/" + action, c.action(action));
router.post("/:id/location", c.location);
router.patch("/:id", c.extend);
module.exports = router;
