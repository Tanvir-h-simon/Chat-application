const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const People = require('../models/People');

function getLogin(req, res, next) {
    const token = req.signedCookies.token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/inbox');
        } catch {
            res.clearCookie('token');
        }
    }
    res.render('index');
}

async function postLogin(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('index', {
            errors: errors.mapped(),
            data: { username: req.body.username },
        });
    }

    try {
        const { username, password } = req.body;

        const user = await People.findOne({
            $or: [{ email: username.toLowerCase() }, { mobile: username }],
        });

        const isMatch = user && await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.render('index', {
                errors: { general: { msg: 'Invalid username or password.' } },
                data: { username },
            });
        }

        // role is included so authorization middleware and views can read it.
        const token = jwt.sign(
            { _id: user._id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.cookie('token', token, {
            signed: true,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });
        res.cookie('flash', 'Logged in successfully!', { signed: true, httpOnly: true });
        res.redirect('/inbox');
    } catch (err) {
        res.render('index', {
            errors: { general: { msg: 'An error occurred. Please try again.' } },
            data: { username: req.body.username },
        });
    }
}

function getLogout(req, res, next) {
    res.clearCookie('token');
    res.cookie('flash', 'Logged out successfully!', { signed: true, httpOnly: true });
    res.redirect('/');
}

module.exports = {
    getLogin,
    postLogin,
    getLogout,
};
