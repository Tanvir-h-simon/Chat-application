const express = require('express');
const { getLogin, postLogin, getLogout } = require('../controllers/loginController');
const decorateHtmlRes = require('../middlewares/common/decorateHtmlRes');
const loginValidator = require('../middlewares/login/loginValidator');

const router = express.Router();

router.get('/', decorateHtmlRes('Login'), getLogin);
router.post('/', decorateHtmlRes('Login'), loginValidator, postLogin);
router.get('/logout', getLogout);

module.exports = router;
