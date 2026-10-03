const router = require("express").Router();
const c = require("../controllers/hazards"),
  { auth, verified } = require("../middleware/auth");
router.use(auth);
router.get("/", c.list);
router.post("/", verified, c.create);
module.exports = router;
