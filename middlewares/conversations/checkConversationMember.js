const Conversation = require("../../models/Conversation");

// Confirms the logged-in user actually belongs to conversation :id before
// letting them upload into it. Returns JSON (this guards an AJAX endpoint).
async function checkConversationMember(req, res, next) {
  try {
    const convo = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    }).select("_id");

    if (!convo) {
      return res
        .status(403)
        .json({ success: false, message: "You are not part of this conversation." });
    }
    next();
  } catch (err) {
    console.error("checkConversationMember error:", err);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

module.exports = checkConversationMember;
