import { sendPasswordResetEmail } from "../services/emailService.js";

dotenv.config();
const router = express.Router();

/* -------------------------------------------------
   VALIDATION SCHEMAS
-------------------------------------------------- */
const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/* -------------------------------------------------
   BROWSER-SAFE GET ROUTES (DEBUG / TEST ONLY)
-------------------------------------------------- */
router.get("/test", (req, res) => {
  res.json({ message: "Auth route is working" });
});

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      roles: user.roles,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

function generateTempPassword() {
  return Math.random().toString(36).slice(-8).toUpperCase();
}

/* -------------------------------------------------
   SIGNUP
-------------------------------------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, phone } = signupSchema.parse(req.body);

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const roles = ["user"];

    if (
      process.env.SUPERADMIN_EMAIL &&
      email.toLowerCase() === process.env.SUPERADMIN_EMAIL.toLowerCase()
    ) {
      roles.push("admin", "superadmin");
    }

    const user = await User.create({
      email,
      name,
      phone,
      passwordHash,
      roles,
    });

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/* -------------------------------------------------
   LOGIN
-------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({
      message: "Server error",
    });
  }
});

/* -------------------------------------------------
   FORGOT PASSWORD
-------------------------------------------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      // Industry best practice: don't reveal if user exists
      return res.json({ message: "If an account exists, a reset email has been sent." });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    user.passwordHash = passwordHash;
    await user.save();

    const sent = await sendPasswordResetEmail(email, tempPassword);

    if (!sent) {
      console.error("Failed to send reset email to:", email);
    }

    res.json({ message: "If an account exists, a reset email has been sent." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
