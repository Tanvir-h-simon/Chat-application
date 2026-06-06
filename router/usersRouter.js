const express = require("express");
const { getUsers } = require("../controller/usersController");
const decorateHtmlRes = require('../middlewares/common/decorateHtmlRes');

const router = express.Router();

// Index page route
router.get("/", decorateHtmlRes('Users'), getUsers);

module.exports = router;
