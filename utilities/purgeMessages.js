const fs = require("fs");
const path = require("path");
const Message = require("../models/Message");

// Delete every message in a conversation along with its attachment files.
// Shared by conversation deletion and user deletion so the cleanup lives in
// one place and nothing is left orphaned in the database or on disk.
async function purgeMessages(conversationId) {
  const msgs = await Message.find({ conversation: conversationId }).select(
    "attachment",
  );
  for (const m of msgs) {
    const f = m.attachment && m.attachment.file;
    if (f && !f.includes("/") && !f.includes("\\") && !f.includes("..")) {
      const p = path.join(__dirname, "..", "public", "attachments", f);
      await fs.promises
        .unlink(p)
        .catch((e) => console.error("Attachment unlink failed:", e.message));
    }
  }
  await Message.deleteMany({ conversation: conversationId });
}

module.exports = purgeMessages;
