const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const People = require("../models/People");

// Minimal cookie-header parser. Avoids pulling in the "cookie" package, which
// is not a top-level dependency here. Values are URL-decoded.
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx < 0) return;
    const key = pair.slice(0, idx).trim();
    if (!key) return;
    out[key] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function isSafeFilename(name) {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..")
  );
}

// Presence helpers: a user may have several open tabs, so we track a set of
// socket ids per user and only flip online/offline on the first/last one.
function addOnline(map, userId, socketId) {
  if (!map.has(userId)) map.set(userId, new Set());
  map.get(userId).add(socketId);
}
function removeOnline(map, userId, socketId) {
  const set = map.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    map.delete(userId);
    return true; // user is now fully offline
  }
  return false;
}

// Recomputes a conversation's lastMessage snapshot after an edit or delete so
// the inbox preview stays correct on next load.
async function refreshLastMessage(conversationId) {
  const last = await Message.findOne({ conversation: conversationId }).sort({
    _id: -1,
  });
  const convo = await Conversation.findById(conversationId);
  if (!convo) return;
  if (last) {
    convo.lastMessage = {
      text:
        last.text ||
        (last.attachment && last.attachment.file ? "Attachment" : ""),
      sender: last.sender,
      sentAt: last.createdAt,
    };
  } else {
    convo.lastMessage = undefined;
  }
  await convo.save();
}

function initSocket(server) {
  const io = new Server(server);

  // userId -> Set(socketId)
  const onlineUsers = new Map();

  // Authenticate every socket with the SAME signed JWT cookie the app uses.
  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const signedToken = cookies.token;
      if (!signedToken) return next(new Error("Not authenticated"));

      const token = cookieParser.signedCookie(
        signedToken,
        process.env.COOKIE_SECRET,
      );
      if (!token) return next(new Error("Bad cookie signature"));

      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id;

    // presence: mark online, tell this socket who's online, tell others 
    addOnline(onlineUsers, userId, socket.id);
    socket.join("user:" + userId); // personal room so controllers can push to a user directly
    socket.emit("presence:list", Array.from(onlineUsers.keys()));
    socket.broadcast.emit("presence:online", { userId });

    // Join a room for every conversation this user is in.
    try {
      const myConvos = await Conversation.find({
        participants: userId,
      }).select("_id");
      myConvos.forEach((c) => socket.join(c._id.toString()));
    } catch (err) {
      console.error("Socket initial join error:", err);
    }

    socket.on("joinConversation", async (conversationId) => {
      try {
        const convo = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        }).select("_id");
        if (convo) socket.join(conversationId);
      } catch (err) {
        console.error("joinConversation error:", err);
      }
    });

    // Receive a message (text and/or attachment), persist it, broadcast it.
    socket.on("sendMessage", async (payload, ack) => {
      try {
        const { conversationId, text, attachment, clientId } = payload || {};
        const body = (text || "").trim();
        const hasAttachment = !!(attachment && attachment.file);

        if (!conversationId || (!body && !hasAttachment)) {
          if (ack) ack({ ok: false, message: "Empty message." });
          return;
        }

        if (hasAttachment && !isSafeFilename(attachment.file)) {
          if (ack) ack({ ok: false, message: "Invalid attachment." });
          return;
        }

        const convo = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!convo) {
          if (ack) ack({ ok: false, message: "Not allowed." });
          return;
        }

        const attachmentData = hasAttachment
          ? { file: attachment.file, type: attachment.type || "" }
          : undefined;

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: body,
          attachment: attachmentData,
        });

        const previewText = body || (hasAttachment ? "Attachment" : "");
        convo.lastMessage = {
          text: previewText,
          sender: userId,
          sentAt: message.createdAt,
        };
        await convo.save();

        const sender = await People.findById(userId).select("name avatar");

        const out = {
          id: message._id.toString(),
          conversationId: conversationId,
          clientId: clientId || null,
          text: body,
          attachment: attachmentData || null,
          sender: {
            id: userId,
            name: sender ? sender.name : "Unknown",
            avatar: sender ? sender.avatar : null,
          },
          createdAt: message.createdAt,
        };

        io.to(conversationId).emit("newMessage", out);
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("sendMessage error:", err);
        if (ack) ack({ ok: false, message: "Could not send message." });
      }
    });

    // Mark a conversation as read up to "now" for this user.
    socket.on("markRead", async (conversationId, ack) => {
      try {
        if (!conversationId) return;
        const now = new Date();

        // Update existing read entry, or push a new one if none exists yet.
        const updated = await Conversation.updateOne(
          { _id: conversationId, participants: userId, "reads.user": userId },
          { $set: { "reads.$.lastReadAt": now } },
        );
        if (updated.matchedCount === 0) {
          await Conversation.updateOne(
            { _id: conversationId, participants: userId },
            { $push: { reads: { user: userId, lastReadAt: now } } },
          );
        }

        // Let the other participant(s) update their "Seen" indicator.
        io.to(conversationId).emit("conversationRead", {
          conversationId,
          userId: userId.toString(),
          lastReadAt: now,
        });
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("markRead error:", err);
        if (ack) ack({ ok: false });
      }
    });

    // Edit a message (sender only).
    socket.on("editMessage", async (payload, ack) => {
      try {
        const { messageId, text } = payload || {};
        const body = (text || "").trim();
        if (!messageId || !body) {
          if (ack) ack({ ok: false, message: "Empty message." });
          return;
        }

        const message = await Message.findById(messageId);
        if (!message) {
          if (ack) ack({ ok: false, message: "Message not found." });
          return;
        }
        if (message.sender.toString() !== userId.toString()) {
          if (ack) ack({ ok: false, message: "Not allowed." });
          return;
        }

        message.text = body;
        message.edited = true;
        await message.save();

        const conversationId = message.conversation.toString();
        await refreshLastMessage(conversationId);

        io.to(conversationId).emit("messageEdited", {
          id: messageId,
          conversationId,
          text: body,
        });
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("editMessage error:", err);
        if (ack) ack({ ok: false, message: "Could not edit message." });
      }
    });

    // Delete a message (sender only). Also removes its attachment file if any.
    socket.on("deleteMessage", async (payload, ack) => {
      try {
        const { messageId } = payload || {};
        const message = await Message.findById(messageId);
        if (!message) {
          if (ack) ack({ ok: false, message: "Message not found." });
          return;
        }
        if (message.sender.toString() !== userId.toString()) {
          if (ack) ack({ ok: false, message: "Not allowed." });
          return;
        }

        const conversationId = message.conversation.toString();

        // Remove the attachment file from disk if present and the name is safe.
        if (
          message.attachment &&
          message.attachment.file &&
          isSafeFilename(message.attachment.file)
        ) {
          const fs = require("fs");
          const path = require("path");
          const filePath = path.join(
            __dirname,
            "..",
            "public",
            "attachments",
            message.attachment.file,
          );
          fs.promises
            .unlink(filePath)
            .catch((e) => console.error("Attachment unlink failed:", e.message));
        }

        await message.deleteOne();
        await refreshLastMessage(conversationId);

        io.to(conversationId).emit("messageDeleted", {
          id: messageId,
          conversationId,
        });
        if (ack) ack({ ok: true });
      } catch (err) {
        console.error("deleteMessage error:", err);
        if (ack) ack({ ok: false, message: "Could not delete message." });
      }
    });

    // typing indicators: relay to the rest of the room (not the sender) 
    socket.on("typing", (conversationId) => {
      if (!conversationId) return;
      socket.to(conversationId).emit("typing", {
        conversationId,
        userId,
        name: socket.user.name,
      });
    });

    socket.on("stopTyping", (conversationId) => {
      if (!conversationId) return;
      socket.to(conversationId).emit("stopTyping", { conversationId, userId });
    });

    // presence: on last tab closing, tell everyone the user went offline
    socket.on("disconnect", () => {
      const wentOffline = removeOnline(onlineUsers, userId, socket.id);
      if (wentOffline) io.emit("presence:offline", { userId });
    });
  });

  return io;
}

module.exports = initSocket;
