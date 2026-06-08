const mongoose = require("mongoose");

// A Conversation is either a 1-to-1 chat (exactly two participants) or a
// group chat (more than two). The same model covers both via the isGroup flag.
const conversationSchema = new mongoose.Schema(
  {
    // The People taking part. Two for a 1:1 chat, more for a group.
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "People",
        required: true,
      },
    ],

    isGroup: {
      type: Boolean,
      default: false,
    },

    // Group name and avatar. Used only when isGroup is true; for a 1:1 chat
    // the name and avatar are taken from the other participant at display time.
    name: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },

    // Who started the conversation / created the group.
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "People",
    },

    // A small snapshot of the most recent message, kept here so the inbox list
    // can show a preview and sort chats by recent activity without loading
    // every message.
    lastMessage: {
      text: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "People" },
      sentAt: { type: Date },
    },

    // When each participant last read this conversation. Drives unread counts
    // and read receipts.
    reads: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "People" },
        lastReadAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

// Supports the inbox list (find by participant, sort by recent activity)
// and the socket join-all-my-rooms query.
conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
