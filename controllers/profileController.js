const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { validationResult } = require("express-validator");
const People = require("../models/People");
const { tokenCookieOptions } = require("../config/cookies");

async function getProfile(req, res, next) {
  try {
    const user = await People.findById(req.user._id);
    if (!user) return res.redirect("/logout");
    res.render("profile", { profile: user });
  } catch (err) {
    console.error("getProfile error:", err);
    next(err);
  }
}

async function updateProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Remove the uploaded avatar if validation failed — don't leave orphan files.
    if (req.file) {
      fs.unlink(
        path.join(__dirname, "..", "public", "avatars", req.file.filename),
        () => {},
      );
    }
    return res.status(400).json({ errors: errors.mapped() });
  }
  try {
    const user = await People.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ errors: { general: { msg: "User not found." } } });
    }

    const { name, age, email, mobile } = req.body;
    user.name = name;
    user.age = age;
    user.email = email.toLowerCase();
    user.mobile = mobile;

    if (req.file) {
      const old = user.avatar;
      user.avatar = req.file.filename;
      if (
        old &&
        !old.includes("/") &&
        !old.includes("\\") &&
        !old.includes("..")
      ) {
        fs.promises
          .unlink(path.join(__dirname, "..", "public", "avatars", old))
          .catch((e) => console.error("Old avatar unlink:", e.message));
      }
    }

    await user.save();

    // Re-issue the JWT so the cookie carries the updated name/email.
    const token = jwt.sign(
      { _id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );
    res.cookie("token", token, tokenCookieOptions);

    res.json({ success: true, message: "Profile updated." });
  } catch (err) {
    console.error("updateProfile error:", err);
    res
      .status(500)
      .json({ errors: { general: { msg: "Could not update profile." } } });
  }
}

async function changePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.mapped() });
  }
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await People.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ errors: { general: { msg: "User not found." } } });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(400).json({
        errors: { currentPassword: { msg: "Current password is incorrect." } },
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password changed." });
  } catch (err) {
    console.error("changePassword error:", err);
    res
      .status(500)
      .json({ errors: { general: { msg: "Could not change password." } } });
  }
}

module.exports = { getProfile, updateProfile, changePassword };
