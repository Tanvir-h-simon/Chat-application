const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const People = require('../models/People');
const { baseCookieOptions, tokenCookieOptions } = require('../config/cookies');

function getLogin(req, res, next) {
    const token = req.signedCookies.token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            return res.redirect('/inbox');
        } catch {
            res.clearCookie('token', baseCookieOptions);
        }
    }
    res.render('index');
}

// Escalating lockout for regular users, keyed on consecutive failed attempts:
//   3rd wrong            -> wait 60 seconds
//   5th wrong and beyond -> wait 5 minutes each
// Attempts 1, 2 and 4 just show "invalid credentials" with no wait.
function lockDurationFor(attempts) {
    if (attempts === 3) return 60 * 1000;
    if (attempts >= 5) return 5 * 60 * 1000;
    return 0;
}

function formatWait(ms) {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

// Re-render the login page with an error shown below the form.
function renderLoginError(res, msg, username) {
    return res.render('index', {
        errors: { general: { msg } },
        data: { username },
    });
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

        // Unknown account: nothing to lock, just a generic message.
        if (!user) {
            return renderLoginError(res, 'Invalid username or password.', username);
        }

        const isAdmin = user.role === 'admin';

        // Regular users: if a lock is active, block before checking the password.
        if (!isAdmin && user.lockUntil && user.lockUntil.getTime() > Date.now()) {
            const remaining = user.lockUntil.getTime() - Date.now();
            return renderLoginError(
                res,
                `Too many attempts. Please try again in ${formatWait(remaining)}.`,
                username
            );
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // Admins are never locked out (educational app; admin needs reliable access).
            if (isAdmin) {
                return renderLoginError(res, 'Invalid username or password.', username);
            }

            // Regular users: count the failure and apply the escalating wait.
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            const lockMs = lockDurationFor(user.failedLoginAttempts);
            let msg = 'Invalid username or password.';
            if (lockMs > 0) {
                user.lockUntil = new Date(Date.now() + lockMs);
                msg = `Too many attempts. Please try again in ${formatWait(lockMs)}.`;
            }
            await user.save();
            return renderLoginError(res, msg, username);
        }

        // Successful login: clear any failure state.
        if (user.failedLoginAttempts || user.lockUntil) {
            user.failedLoginAttempts = 0;
            user.lockUntil = null;
            await user.save();
        }

        // role is included so authorization middleware and views can read it.
        const token = jwt.sign(
            { _id: user._id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.cookie('token', token, tokenCookieOptions);
        res.cookie('flash', 'Logged in successfully!', baseCookieOptions);
        res.redirect('/inbox');
    } catch (err) {
        return renderLoginError(res, 'An error occurred. Please try again.', req.body.username);
    }
}

function getLogout(req, res, next) {
    res.clearCookie('token', baseCookieOptions);
    res.cookie('flash', 'Logged out successfully!', baseCookieOptions);
    res.redirect('/');
}

module.exports = {
    getLogin,
    postLogin,
    getLogout,
};
