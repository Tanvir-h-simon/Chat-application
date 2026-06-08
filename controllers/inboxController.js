const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

async function getInbox(req, res, next) {
  try {
    const myId = req.user._id;

    const conversations = await Conversation.find({ participants: myId })
      .populate("participants", "name avatar email")
      .sort({ updatedAt: -1 });

    const conversationList = await Promise.all(
      conversations.map(async (conv) => {
        let title;
        let avatar;
        let otherUserId = null;

        const memberIds = conv.participants
          .filter((p) => p._id.toString() !== myId.toString())
          .map((p) => p._id.toString());

        if (conv.isGroup) {
          title = conv.name || "Unnamed group";
          avatar = conv.avatar || null;
        } else {
          const other = conv.participants.find(
            (p) => p._id.toString() !== myId.toString(),
          );
          title = other ? other.name : "Unknown user";
          avatar = other ? other.avatar : null;
          otherUserId = other ? other._id.toString() : null;
        }

        const lastMessageAt =
          conv.lastMessage && conv.lastMessage.sentAt
            ? conv.lastMessage.sentAt
            : conv.updatedAt;

        // Unread = messages from others sent after my last read time.
        const myRead = (conv.reads || []).find(
          (r) => r.user && r.user.toString() === myId.toString(),
        );
        const since =
          myRead && myRead.lastReadAt ? myRead.lastReadAt : new Date(0);
        const unread = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: myId },
          createdAt: { $gt: since },
        });

        return {
          id: conv._id.toString(),
          title,
          avatar,
          isGroup: conv.isGroup,
          otherUserId,
          memberIds,
          lastMessage: conv.lastMessage ? conv.lastMessage.text || "" : "",
          lastMessageAt,
          updatedAt: conv.updatedAt,
          unread,
        };
      }),
    );

    res.render("inbox", { conversations: conversationList });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.render("inbox", { conversations: [] });
  }
}

module.exports = { getInbox };
