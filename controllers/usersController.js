const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const People = require("../models/People");

async function getUsers(req, res, next) {
  try {
    const users = await People.find();
    res.render("users", { users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).render("users", {
      users: [],
      error: "An error occurred while fetching users.",
    });
  }
}

async function addUsers(req, res, next) {
  try {
    const { name, age, email, mobile, password, role } = req.body;
    const avatar = req.file ? req.file.filename : null;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new People({
      name,
      age,
      email,
      mobile,
      password: hashedPassword,
      avatar,
      // Only "admin" is accepted as an elevated role; anything else stays "user".
      role: role === "admin" ? "admin" : "user",
    });

    await newUser.save();
    res
      .status(201)
      .json({ success: true, message: "User added successfully." });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({
      errors: {
        general: {
          msg: "An error occurred while adding the user. Please try again.",
        },
      },
    });
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = req.params.id;

    // Stop an admin from deleting their own account (prevents self lock-out).
    if (req.user && req.user._id === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const user = await People.findByIdAndDelete(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Remove the avatar file. Filename comes from the DB record (not the
    // client), and a missing file is logged but does not fail the request.
    if (user.avatar) {
      const avatarPath = path.join(
        __dirname,
        "..",
        "public",
        "avatars",
        user.avatar,
      );
      await fs.promises.unlink(avatarPath).catch((err) => {
        console.error("Could not delete avatar file:", err.message);
      });
    }

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the user. Please try again.",
    });
  }
}

module.exports = {
  getUsers,
  addUsers,
  deleteUser,
};
