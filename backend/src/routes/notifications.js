const router = require("express").Router();
const c = require("../controllers/notifications"),
  { auth } = require("../middleware/auth");
router.use(auth);
router.get("/settings", c.settings);
router.get("/mail-preview", c.preview);
router.post("/devices", c.register);
router.delete("/devices", c.remove);
module.exports = router;
