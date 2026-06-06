const express = require('express');
const { getLogin } = require('../controller/loginController');
const decorateHtmlRes = require('../middlewares/common/decorateHtmlRes');

const router = express.Router();

// Login page route
router.get('/', decorateHtmlRes('Login'), getLogin);

module.exports = router;
