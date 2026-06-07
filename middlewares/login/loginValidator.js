const { check } = require('express-validator');

const loginValidator = [
    check("username")
        .trim()
        .notEmpty()
        .withMessage("Email or mobile number is required.")
        .custom((value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const mobileRegex = /^\+?[\d\s\-(). ]{7,15}$/;
            if (!emailRegex.test(value) && !mobileRegex.test(value)) {
                throw new Error("Enter a valid email address or mobile number.");
            }
            return true;
        }),
    check("password")
        .notEmpty()
        .withMessage("Password is required.")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters."),
];

module.exports = loginValidator;
