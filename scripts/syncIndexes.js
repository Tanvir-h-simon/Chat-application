const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const People = require("../models/People");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

async function syncIndexes() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([
    People.syncIndexes(),
    Conversation.syncIndexes(),
    Message.syncIndexes(),
  ]);
  console.log("Indexes synced.");
  await mongoose.disconnect();
}

syncIndexes().catch((err) => {
  console.error("Index sync failed:", err);
  process.exit(1);
});
