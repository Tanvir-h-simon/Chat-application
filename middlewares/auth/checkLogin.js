const jwt = require('jsonwebtoken');

function checkLogin(req, res, next) {
    const token = req.signedCookies.token;
    if (!token) return res.redirect('/');

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.clearCookie('token');
        res.redirect('/');
    }
}

module.exports = checkLogin;
