const express = require("express");
const {
  getUsers,
  addUsers,
  deleteUser,
} = require("../controllers/usersController");
const decorateHtmlRes = require("../middlewares/common/decorateHtmlRes");
const checkLogin = require("../middlewares/auth/checkLogin");
const checkAdmin = require("../middlewares/auth/checkAdmin");
const avatarUpload = require("../middlewares/users/avatarUpload");
const {
  addUserValidators,
  addUserValidatorsHandler,
} = require("../middlewares/users/usersValidator");

const router = express.Router();

// The entire user-management section is admin-only.
// checkLogin runs first (sets req.user), then checkAdmin enforces the role.

// Users list page
router.get("/", checkLogin, checkAdmin, decorateHtmlRes("Users"), getUsers);

// Add user
router.post(
  "/",
  checkLogin,
  checkAdmin,
  avatarUpload,
  addUserValidators,
  addUserValidatorsHandler,
  addUsers,
);

// Delete user
router.delete("/:id", checkLogin, checkAdmin, deleteUser);

module.exports = router;
