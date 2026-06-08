const jwt = require('jsonwebtoken');
const { baseCookieOptions } = require('../../config/cookies');

function decorateHtmlRes(page_title) {
    return function (req, res, next) {
        res.locals.title = `${page_title} | ${process.env.APP_NAME || 'Chat Application'}`;

        const token = req.signedCookies.token;
        try {
            res.locals.user = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
        } catch {
            res.locals.user = null;
        }
        res.locals.isLoggedIn = !!res.locals.user;

        const flash = req.signedCookies.flash;
        if (flash) {
            res.locals.flash = flash;
            res.clearCookie('flash', baseCookieOptions);
        } else {
            res.locals.flash = null;
        }

        next();
    }
}

module.exports = decorateHtmlRes;