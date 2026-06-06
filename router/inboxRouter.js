const express = require("express");
const { getInbox } = require("../controller/inboxController");
const decorateHtmlRes = require('../middlewares/common/decorateHtmlRes');

const router = express.Router();

// Inbox page route
router.get("/", decorateHtmlRes('Inbox'), getInbox);

module.exports = router;
