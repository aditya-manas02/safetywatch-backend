import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";

dotenv.config();

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }
  const existing = await User.findOne({ email });
  if (existing) {
    existing.roles = Array.from(new Set([...existing.roles, "admin"]));
    await existing.save();
    console.log("Existing user promoted to admin:", email);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, roles: ["user", "admin"] });
    console.log("Admin created:", user.email);
  }
  process.exit(0);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
