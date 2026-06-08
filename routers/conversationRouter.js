const express = require("express");
const {
  searchUsers,
  createDirectConversation,
  createGroupConversation,
  getMessages,
  uploadAttachment,
  getConversationDetails,
  renameGroup,
  addMembers,
  removeMember,
  setGroupAvatar,
  leaveGroup,
  deleteConversation,
} = require("../controllers/conversationController");
const checkLogin = require("../middlewares/auth/checkLogin");
const checkConversationMember = require("../middlewares/conversations/checkConversationMember");
const attachmentUpload = require("../middlewares/conversations/attachmentUpload");
const checkGroupCreator = require("../middlewares/conversations/checkGroupCreator");
const groupAvatarUpload = require("../middlewares/conversations/groupAvatarUpload");

const router = express.Router();

// Every conversation action requires a logged-in user (any role).
router.get("/search-users", checkLogin, searchUsers);
router.get("/:id/messages", checkLogin, getMessages);
router.post("/", checkLogin, createDirectConversation);
router.post("/group", checkLogin, createGroupConversation);

// Upload an attachment into a conversation. Membership is checked BEFORE the
// file is stored, so non-members never write files to disk.
router.post(
  "/:id/attachment",
  checkLogin,
  checkConversationMember,
  attachmentUpload,
  uploadAttachment,
);

// Conversation / group management.
router.get("/:id/details", checkLogin, getConversationDetails);
router.patch("/:id", checkLogin, checkGroupCreator, renameGroup);
router.post("/:id/members", checkLogin, checkGroupCreator, addMembers);
router.delete("/:id/members/:userId", checkLogin, checkGroupCreator, removeMember);
router.post("/:id/avatar", checkLogin, checkGroupCreator, groupAvatarUpload, setGroupAvatar);
router.post("/:id/leave", checkLogin, leaveGroup);
router.delete("/:id", checkLogin, deleteConversation);

module.exports = router;
