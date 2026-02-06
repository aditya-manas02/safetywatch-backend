/**
 * Migration Script: Add Default Area Code to Existing Data
 * 
 * This script:
 * 1. Creates a default area code "DEFAULT"
 * 2. Assigns all existing users to this area code
 * 3. Assigns all existing incidents to this area code
 * 4. Updates statistics
 * 
 * Run this ONCE after deploying the new code
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";
import Incident from "../src/models/Incident.js";
import AreaCode from "../src/models/AreaCode.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    // Step 1: Create default area code
    console.log("Step 1: Creating default area code...");
    let defaultAreaCode = await AreaCode.findOne({ code: "DEFAULT" });
    
    if (!defaultAreaCode) {
      // Find a superadmin to set as creator
      const superadmin = await User.findOne({ roles: "superadmin" });
      if (!superadmin) {
        console.error("❌ No superadmin found. Please create a superadmin first.");
        process.exit(1);
      }

      defaultAreaCode = await AreaCode.create({
        code: "DEFAULT",
        name: "Default Region",
        description: "Default area code for existing users and incidents. Please reassign to proper area codes.",
        isActive: true,
        createdBy: superadmin._id
      });
      console.log(`✓ Created default area code: ${defaultAreaCode.code}\n`);
    } else {
      console.log(`✓ Default area code already exists: ${defaultAreaCode.code}\n`);
    }

    // Step 2: Update users without area code
    console.log("Step 2: Updating users without area code...");
    const usersWithoutAreaCode = await User.countDocuments({ 
      $or: [{ areaCode: null }, { areaCode: { $exists: false } }] 
    });
    
    if (usersWithoutAreaCode > 0) {
      const result = await User.updateMany(
        { $or: [{ areaCode: null }, { areaCode: { $exists: false } }] },
        { $set: { areaCode: "DEFAULT" } }
      );
      console.log(`✓ Updated ${result.modifiedCount} users with default area code\n`);
    } else {
      console.log("✓ All users already have area codes\n");
    }

    // Step 3: Update incidents without area code
    console.log("Step 3: Updating incidents without area code...");
    const incidentsWithoutAreaCode = await Incident.countDocuments({ 
      $or: [{ areaCode: null }, { areaCode: { $exists: false } }] 
    });
    
    if (incidentsWithoutAreaCode > 0) {
      const result = await Incident.updateMany(
        { $or: [{ areaCode: null }, { areaCode: { $exists: false } }] },
        { $set: { areaCode: "DEFAULT" } }
      );
      console.log(`✓ Updated ${result.modifiedCount} incidents with default area code\n`);
    } else {
      console.log("✓ All incidents already have area codes\n");
    }

    // Step 4: Update statistics
    console.log("Step 4: Updating area code statistics...");
    const totalUsers = await User.countDocuments({ areaCode: "DEFAULT" });
    const totalIncidents = await Incident.countDocuments({ areaCode: "DEFAULT" });
    
    defaultAreaCode.totalUsers = totalUsers;
    defaultAreaCode.totalIncidents = totalIncidents;
    await defaultAreaCode.save();
    
    console.log(`✓ Updated statistics:`);
    console.log(`  - Total users: ${totalUsers}`);
    console.log(`  - Total incidents: ${totalIncidents}\n`);

    // Summary
    console.log("═══════════════════════════════════════");
    console.log("Migration completed successfully!");
    console.log("═══════════════════════════════════════");
    console.log(`Default Area Code: ${defaultAreaCode.code}`);
    console.log(`Area Name: ${defaultAreaCode.name}`);
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Incidents: ${totalIncidents}`);
    console.log("\nNext Steps:");
    console.log("1. Login as SuperAdmin");
    console.log("2. Create new area codes for your regions");
    console.log("3. Assign admins to area codes");
    console.log("4. Reassign users and incidents to proper area codes");
    console.log("═══════════════════════════════════════\n");

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();
