const router = require("express").Router();
const c = require("../controllers/contacts"),
  { auth, verified } = require("../middleware/auth");
router.use(auth);
router.get("/", c.list);
router.post("/", verified, require("../middleware/rateLimit")(10), c.invite);
router.post("/:id/accept", verified, c.respond);
router.post("/:id/decline", verified, c.respond);
router.delete("/:id", c.remove);
module.exports = router;
