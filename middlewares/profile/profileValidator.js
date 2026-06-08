const { check } = require("express-validator");
const People = require("../../models/People");

const updateProfileValidators = [
  check("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isAlpha("en-US", { ignore: " " })
    .withMessage("Name must contain only letters and spaces."),
  check("age")
    .notEmpty()
    .withMessage("Age is required.")
    .isInt({ min: 0 })
    .withMessage("Age must be a non-negative integer.")
    .toInt(),
  check("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email format.")
    .custom(async (email, { req }) => {
      const existing = await People.findOne({ email: email.toLowerCase() });
      // Allow keeping your own email; reject if it belongs to someone else.
      if (existing && existing._id.toString() !== req.user._id.toString()) {
        throw new Error("Email already in use.");
      }
    }),
  check("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .isMobilePhone("any", { strictMode: true })
    .withMessage(
      "Enter a valid phone number with country code, e.g. +8801712345678.",
    ),
];

const changePasswordValidators = [
  check("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),
  check("newPassword")
    .isStrongPassword({
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 6 characters and include uppercase, lowercase, numbers, and symbols.",
    ),
];

module.exports = { updateProfileValidators, changePasswordValidators };
