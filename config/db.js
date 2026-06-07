const mongoose = require("mongoose");

// Connects to MongoDB. Kept out of app.js so startup logic stays clean
// and the connection can be reused (e.g. by scripts).
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

module.exports = connectDB;
