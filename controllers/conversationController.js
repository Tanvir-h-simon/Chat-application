const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const People = require("../models/People");
const fs = require("fs");
const path = require("path");
const purgeMessages = require("../utilities/purgeMessages");

// GET /conversations/search-users?q=...
async function searchUsers(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.json({ users: [] });
    }

    const users = await People.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("name avatar email")
      .limit(10);

    res.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ users: [], message: "Search failed." });
  }
}

// POST /conversations -> 1-to-1 chat (reused if it already exists)
async function createDirectConversation(req, res, next) {
  try {
    const myId = req.user._id;
    const { partnerId } = req.body;

    if (!partnerId || partnerId === myId.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user selected." });
    }

    const partner = await People.findById(partnerId).select("_id");
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [myId, partnerId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, partnerId],
        isGroup: false,
        creator: myId,
      });
    }

    res.status(201).json({ success: true, conversationId: conversation._id });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res
      .status(500)
      .json({ success: false, message: "Could not start conversation." });
  }
}

// POST /conversations/group -> group chat
async function createGroupConversation(req, res, next) {
  try {
    const myId = req.user._id;
    let { name, members } = req.body;

    name = (name || "").trim();
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Group name is required." });
    }

    if (!Array.isArray(members)) {
      members = members ? [members] : [];
    }

    const uniqueMembers = [...new Set(members.map(String))].filter(
      (id) => id && id !== myId.toString(),
    );

    if (uniqueMembers.length < 2) {
      return res.status(400).json({
        success: false,
        message: "A group needs at least 2 other members.",
      });
    }

    const found = await People.find({ _id: { $in: uniqueMembers } }).select(
      "_id",
    );
    if (found.length !== uniqueMembers.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected users do not exist.",
      });
    }

    const conversation = await Conversation.create({
      participants: [myId, ...uniqueMembers],
      isGroup: true,
      name,
      creator: myId,
    });

    res.status(201).json({ success: true, conversationId: conversation._id });
  } catch (error) {
    console.error("Error creating group:", error);
    res
      .status(500)
      .json({ success: false, message: "Could not create group." });
  }
}

// GET /conversations/:id/messages?before=<messageId>&limit=30
// Returns a paginated window of messages, newest-first, with an optional
// `before` cursor (_id) to fetch older pages. Guarded to participants only.
async function getMessages(req, res, next) {
  try {
    const myId = req.user._id;
    const conversationId = req.params.id;

    const convo = await Conversation.findOne({
      _id: conversationId,
      participants: myId,
    }).populate("participants", "name avatar email");

    if (!convo) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
    }

    let title;
    if (convo.isGroup) {
      title = convo.name || "Unnamed group";
    } else {
      const other = convo.participants.find(
        (p) => p._id.toString() !== myId.toString(),
      );
      title = other ? other.name : "Unknown user";
    }

    // For 1:1 chats, expose when the other participant last read the conversation
    // so the client can show a "Seen" indicator under our last sent message.
    let otherLastReadAt = null;
    if (!convo.isGroup) {
      const other = convo.participants.find(
        (p) => p._id.toString() !== myId.toString(),
      );
      if (other) {
        const r = (convo.reads || []).find(
          (x) => x.user && x.user.toString() === other._id.toString(),
        );
        otherLastReadAt = r && r.lastReadAt ? r.lastReadAt : null;
      }
    }

    // Pagination: newest-first window, optional `before` cursor (a message _id).
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const before = req.query.before;

    const query = { conversation: conversationId };
    if (before) query._id = { $lt: before };

    // Fetch one extra to detect whether older messages remain.
    const docs = await Message.find(query)
      .populate("sender", "name avatar")
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = docs.length > limit;
    if (hasMore) docs.pop();
    docs.reverse(); // back to chronological (oldest -> newest)

    const out = docs.map((m) => ({
      id: m._id.toString(),
      text: m.text,
      attachment: m.attachment && m.attachment.file ? m.attachment : null,
      sender: {
        id: m.sender ? m.sender._id.toString() : null,
        name: m.sender ? m.sender.name : "Unknown",
        avatar: m.sender ? m.sender.avatar : null,
      },
      createdAt: m.createdAt,
      edited: m.edited,
    }));

    res.json({
      success: true,
      conversation: {
        id: convo._id.toString(),
        title,
        isGroup: convo.isGroup,
        otherLastReadAt,
      },
      messages: out,
      hasMore,                                   // are there older messages?
      oldestId: out.length ? out[0].id : null,   // cursor for the next older page
    });
  } catch (error) {
    console.error("Error loading messages:", error);
    res
      .status(500)
      .json({ success: false, message: "Could not load messages." });
  }
}

// POST /conversations/:id/attachment
// The file is already stored by multer and membership already verified, so we
// just hand the stored filename + type back to the client, which then sends a
// message referencing it over the socket.
async function uploadAttachment(req, res, next) {
  res.status(201).json({
    success: true,
    file: req.file.filename,
    type: req.file.mimetype,
  });
}

// helpers 
// Tell a set of users to refresh their inbox (full reload on the client).
function notifyInboxChanged(req, userIds) {
  const io = req.app.get("io");
  if (!io) return;
  userIds.forEach((id) =>
    io.to("user:" + id.toString()).emit("inboxChanged"),
  );
}

// management routes 
// GET /conversations/:id/details -> info for the settings panel
async function getConversationDetails(req, res) {
  try {
    const myId = req.user._id;
    const convo = await Conversation.findOne({
      _id: req.params.id,
      participants: myId,
    }).populate("participants", "name avatar email");
    if (!convo) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
    }
    res.json({
      success: true,
      conversation: {
        id: convo._id.toString(),
        isGroup: convo.isGroup,
        name: convo.name || "",
        avatar: convo.avatar || null,
        creatorId: convo.creator ? convo.creator.toString() : null,
        isCreator: convo.creator
          ? convo.creator.toString() === myId.toString()
          : false,
        members: convo.participants.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          avatar: p.avatar || null,
          email: p.email,
        })),
      },
    });
  } catch (err) {
    console.error("getConversationDetails error:", err);
    res.status(500).json({ success: false, message: "Could not load details." });
  }
}

// PATCH /conversations/:id -> rename (creator only; req.conversation set by middleware)
async function renameGroup(req, res) {
  try {
    const convo = req.conversation;
    const name = (req.body.name || "").trim();
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Group name is required." });
    }
    convo.name = name;
    await convo.save();
    const io = req.app.get("io");
    if (io)
      io.to(convo._id.toString()).emit("groupRenamed", {
        conversationId: convo._id.toString(),
        name,
      });
    res.json({ success: true });
  } catch (err) {
    console.error("renameGroup error:", err);
    res.status(500).json({ success: false, message: "Could not rename group." });
  }
}

// POST /conversations/:id/members  { members: [ids] } -> add (creator only)
async function addMembers(req, res) {
  try {
    const convo = req.conversation;
    let { members } = req.body;
    if (!Array.isArray(members)) members = members ? [members] : [];

    const existing = new Set(convo.participants.map(String));
    const toAdd = [...new Set(members.map(String))].filter(
      (id) => id && !existing.has(id),
    );
    if (toAdd.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No new members to add." });
    }
    const found = await People.find({ _id: { $in: toAdd } }).select("_id");
    if (found.length !== toAdd.length) {
      return res
        .status(400)
        .json({ success: false, message: "One or more users do not exist." });
    }
    convo.participants.push(...toAdd);
    await convo.save();
    notifyInboxChanged(req, toAdd); // new members reload and see the group
    res.json({ success: true });
  } catch (err) {
    console.error("addMembers error:", err);
    res.status(500).json({ success: false, message: "Could not add members." });
  }
}

// DELETE /conversations/:id/members/:userId -> remove (creator only)
async function removeMember(req, res) {
  try {
    const convo = req.conversation;
    const targetId = req.params.userId;

    if (targetId === convo.creator.toString()) {
      return res.status(400).json({
        success: false,
        message: "The creator cannot be removed. Delete the group instead.",
      });
    }
    if (!convo.participants.map(String).includes(targetId)) {
      return res
        .status(404)
        .json({ success: false, message: "User is not a member." });
    }

    const before = convo.participants.map(String);
    convo.participants = convo.participants.filter(
      (p) => p.toString() !== targetId,
    );

    if (convo.participants.length < 2) {
      await purgeMessages(convo._id);
      await convo.deleteOne();
      notifyInboxChanged(req, before);
      return res.json({ success: true, deleted: true });
    }

    await convo.save();
    const io = req.app.get("io");
    if (io)
      io.to("user:" + targetId).emit("removedFromConversation", {
        conversationId: convo._id.toString(),
      });
    res.json({ success: true });
  } catch (err) {
    console.error("removeMember error:", err);
    res.status(500).json({ success: false, message: "Could not remove member." });
  }
}

// POST /conversations/:id/avatar -> set group photo (creator only)
async function setGroupAvatar(req, res) {
  try {
    const convo = req.conversation;
    // Remove the previous group photo file if there was one.
    const old = convo.avatar;
    if (old && !old.includes("/") && !old.includes("\\") && !old.includes("..")) {
      const p = path.join(__dirname, "..", "public", "avatars", old);
      fs.promises
        .unlink(p)
        .catch((e) => console.error("Old group avatar unlink:", e.message));
    }
    convo.avatar = req.file.filename;
    await convo.save();
    const io = req.app.get("io");
    if (io)
      io.to(convo._id.toString()).emit("groupAvatarChanged", {
        conversationId: convo._id.toString(),
        avatar: convo.avatar,
      });
    res.json({ success: true, avatar: convo.avatar });
  } catch (err) {
    console.error("setGroupAvatar error:", err);
    res.status(500).json({ success: false, message: "Could not update photo." });
  }
}

// POST /conversations/:id/leave -> leave a group (any member)
async function leaveGroup(req, res) {
  try {
    const myId = req.user._id;
    const convo = await Conversation.findOne({
      _id: req.params.id,
      participants: myId,
    });
    if (!convo) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
    }
    if (!convo.isGroup) {
      return res
        .status(400)
        .json({ success: false, message: "You can only leave group chats." });
    }

    const before = convo.participants.map(String);
    convo.participants = convo.participants.filter(
      (p) => p.toString() !== myId.toString(),
    );

    if (convo.participants.length < 2) {
      await purgeMessages(convo._id);
      await convo.deleteOne();
      notifyInboxChanged(req, before);
      return res.json({ success: true, deleted: true });
    }

    // If the creator leaves, hand the group to a remaining member.
    if (convo.creator && convo.creator.toString() === myId.toString()) {
      convo.creator = convo.participants[0];
    }
    await convo.save();
    res.json({ success: true });
  } catch (err) {
    console.error("leaveGroup error:", err);
    res.status(500).json({ success: false, message: "Could not leave group." });
  }
}

// DELETE /conversations/:id -> delete (group: creator only; 1:1: either party)
async function deleteConversation(req, res) {
  try {
    const myId = req.user._id;
    const convo = await Conversation.findOne({
      _id: req.params.id,
      participants: myId,
    });
    if (!convo) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
    }
    if (convo.isGroup) {
      if (!convo.creator || convo.creator.toString() !== myId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the group creator can delete this group.",
        });
      }
    }
    const ids = convo.participants.map(String);
    await purgeMessages(convo._id);
    await convo.deleteOne();
    notifyInboxChanged(req, ids);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteConversation error:", err);
    res
      .status(500)
      .json({ success: false, message: "Could not delete conversation." });
  }
}

module.exports = {
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
};
