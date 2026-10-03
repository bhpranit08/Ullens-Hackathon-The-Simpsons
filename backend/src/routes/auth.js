const router = require("express").Router();
const c = require("../controllers/auth"),
  { auth } = require("../middleware/auth");
const limit = require("../middleware/rateLimit");
router.post("/register", limit(20), c.register);
router.post("/login", limit(40), c.login);
router.post("/verify", limit(20), c.verify);
router.post("/forgot-password", limit(5), c.forgot);
router.post("/reset-password", limit(10), c.reset);
router.get("/me", auth, c.me);
router.patch("/profile", auth, c.profile);
router.post("/logout", auth, c.logout);
router.post("/resend-verification", auth, limit(5), c.resend);
module.exports = router;
