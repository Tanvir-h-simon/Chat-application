const mongoose = require("mongoose");

// A single message inside a conversation. It carries text, an optional
// attachment, or both. The sender must be one of the conversation's participants.
const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "People",
      required: true,
    },

    text: {
      type: String,
      trim: true,
    },

    // Optional file or image sent with the message.
    // "file" is the stored filename in public/attachments/.
    // "type" is the mimetype so the view knows whether to render an image
    // or a download link.
    attachment: {
      file: { type: String },
      type: { type: String },
    },

    edited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Supports loading/paginating a conversation's messages newest-first.
messageSchema.index({ conversation: 1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
