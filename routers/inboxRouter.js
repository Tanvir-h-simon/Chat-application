const express = require("express");
const { getInbox } = require("../controllers/inboxController");
const decorateHtmlRes = require('../middlewares/common/decorateHtmlRes');
const checkLogin = require('../middlewares/auth/checkLogin');

const router = express.Router();

// Inbox is available to every logged-in user (not admin-only).
router.get("/", checkLogin, decorateHtmlRes('Inbox'), getInbox);

module.exports = router;
