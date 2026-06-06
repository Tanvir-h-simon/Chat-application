const { check, validationResult } = require("express-validator");
const { unlink } = require("fs");
const path = require("path");
const People = require("../../models/People");

const addUserValidators = [
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
    .custom(async (email) => {
      const user = await People.findOne({ email });
      if (user) {
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
  check("password")
    .isStrongPassword({
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 6 characters long and include uppercase, lowercase, numbers, and symbols.",
    ),
];

const addUserValidatorsHandler = async (req, res, next) => {
  const errors = validationResult(req);
  const mappedErrors = errors.mapped();
  if (!errors.isEmpty()) {
    if (req.file) {
      const { filename } = req.file;
      unlink(
        path.join(__dirname, "..", "..", "public", "avatars", filename),
        (err) => {
          if (err) {
            console.error("Error deleting uploaded avatar:", err);
          }
        },
      );
    }
    return res.status(400).json({ errors: mappedErrors });
  }
  next();
};

module.exports = {
  addUserValidators,
  addUserValidatorsHandler,
};
