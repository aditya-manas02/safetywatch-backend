import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Authenticate user using JWT
 */
export const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header)
    return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id);
    if (!user)
      return res.status(401).json({ message: "Invalid token (user not found)" });

    // Attach complete user (including roles) to request
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      isSuperAdmin: user.roles.includes("superadmin"),
      isAdmin: user.roles.includes("admin") || user.roles.includes("superadmin")
    };

    next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Only admins OR superadmins allowed
 */
export const requireAdminOnly = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ message: "Unauthorized" });

  if (!req.user.roles.includes("admin") && !req.user.roles.includes("superadmin"))
    return res.status(403).json({ message: "Admin access required" });

  next();
};

/**
 * ONLY superadmin allowed
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ message: "Unauthorized" });

  if (!req.user.roles.includes("superadmin"))
    return res.status(403).json({ message: "Only superadmin can perform this action" });

  next();
};
