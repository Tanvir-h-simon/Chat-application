// One-time script to create the first admin account.
// Run with:  npm run seed:admin
//
// Because the app has no public registration, this bootstraps the very first
// admin. That admin can then create every other account from the Users page.
// Credentials are read from .env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_MOBILE).

const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const People = require("../models/People");

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = (process.env.ADMIN_EMAIL || "admin@chat.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";

  const existing = await People.findOne({ email });
  if (existing) {
    console.log(`An account with ${email} already exists. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await People.create({
    name: "Admin",
    age: 18,
    email,
    mobile: process.env.ADMIN_MOBILE || "+8801000000000",
    password: hashedPassword,
    role: "admin",
  });

  console.log("Admin account created successfully.");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("Log in with these credentials, then create the rest of your users.");

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
