const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const People = require("../models/People");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const purgeMessages = require("../utilities/purgeMessages");

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

    // Clean up all chat data tied to this user so nothing is orphaned in the DB.
    const conversations = await Conversation.find({ participants: userId });
    for (const convo of conversations) {
      const remaining = convo.participants.filter(
        (p) => p.toString() !== userId.toString(),
      );
      // A 1:1 chat, or a group that would drop below 2 members, is removed
      // entirely (along with its messages and attachment files).
      if (!convo.isGroup || remaining.length < 2) {
        await purgeMessages(convo._id);
        await convo.deleteOne();
        continue;
      }
      // Otherwise keep the group: drop this member, reassign the creator if it
      // was them, so the remaining members are unaffected.
      convo.participants = remaining;
      if (convo.creator && convo.creator.toString() === userId.toString()) {
        convo.creator = remaining[0];
      }
      await convo.save();
    }
    // Remove any messages this user authored in the groups that survived.
    await Message.deleteMany({ sender: userId });

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
