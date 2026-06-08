const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
} = require("../controllers/profileController");
const decorateHtmlRes = require("../middlewares/common/decorateHtmlRes");
const checkLogin = require("../middlewares/auth/checkLogin");
const avatarUpload = require("../middlewares/users/avatarUpload");
const {
  updateProfileValidators,
  changePasswordValidators,
} = require("../middlewares/profile/profileValidator");

const router = express.Router();

router.get("/", checkLogin, decorateHtmlRes("Profile"), getProfile);

// avatarUpload parses the multipart body (and the optional file) before validators.
router.post(
  "/",
  checkLogin,
  avatarUpload,
  updateProfileValidators,
  updateProfile,
);

router.post("/password", checkLogin, changePasswordValidators, changePassword);

module.exports = router;
