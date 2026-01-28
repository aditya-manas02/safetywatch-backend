// backend/scripts/seedSuperadmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../src/models/User.js";

dotenv.config();

const main = async () => {
  if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
    console.error("Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env before running this script.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.SUPERADMIN_EMAIL.toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;

  let user = await User.findOne({ email });

  if (user) {
    // ensure roles include superadmin & admin
    user.roles = Array.from(new Set([...(user.roles || []), "superadmin", "admin"]));
    await user.save();
    console.log("Existing user promoted to superadmin:", email);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({ email, passwordHash, roles: ["user", "admin", "superadmin"] });
    console.log("Superadmin created:", email);
  }

  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
