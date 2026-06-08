const Conversation = require("../../models/Conversation");

// Loads the conversation, confirms it is a group, and confirms the logged-in
// user created it. Attaches it as req.conversation for the controller.
async function checkGroupCreator(req, res, next) {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
    }
    if (!convo.isGroup) {
      return res
        .status(400)
        .json({ success: false, message: "This is not a group chat." });
    }
    if (!convo.creator || convo.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the group creator can manage this group.",
      });
    }
    req.conversation = convo;
    next();
  } catch (err) {
    console.error("checkGroupCreator error:", err);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

module.exports = checkGroupCreator;
