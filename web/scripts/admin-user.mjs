import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

function loadEnvIfNeeded() {
  if (process.env.MONGODB_URI) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const out = { reset: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--reset") {
      out.reset = true;
    } else if (arg.startsWith("--email=")) {
      out.email = arg.slice(8);
    } else if (arg === "--email") {
      out.email = argv[++i];
    } else if (arg.startsWith("--password=")) {
      out.password = arg.slice(11);
    } else if (arg === "--password") {
      out.password = argv[++i];
    } else if (arg.startsWith("--name=")) {
      out.name = arg.slice(7);
    } else if (arg === "--name") {
      out.name = argv[++i];
    } else if (arg.startsWith("--role=")) {
      out.role = arg.slice(7);
    } else if (arg === "--role") {
      out.role = argv[++i];
    }
  }
  return out;
}

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "staff"], required: true },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecretEncrypted: { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function run() {
  loadEnvIfNeeded();
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email || process.env.OWNER_EMAIL || "").trim().toLowerCase();
  const password = args.password || process.env.OWNER_PASSWORD || "";
  const name = (args.name || process.env.OWNER_NAME || "Owner").trim();
  const role = args.role === "staff" ? "staff" : "owner";

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is required (set in environment or web/.env).");
    process.exit(1);
  }
  if (!email) {
    console.error(
      "Usage: node scripts/admin-user.mjs --email=you@domain.com --password=yourpass [--name=Owner] [--role=owner|staff] [--reset]",
    );
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters long.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: "ligera" });
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });

  if (existing) {
    if (!args.reset) {
      console.log(`User ${email} already exists (role: ${existing.role}). Pass --reset to update password.`);
      await mongoose.disconnect();
      return;
    }
    existing.passwordHash = passwordHash;
    existing.failedLoginAttempts = 0;
    existing.lockedUntil = null;
    if (args.name) existing.name = name;
    if (args.role) existing.role = role;
    await existing.save();
    console.log(`Password reset for ${email} (role: ${existing.role}).`);
  } else {
    await User.create({
      name,
      email,
      passwordHash,
      role,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    console.log(`Created ${role} user ${email}.`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Failed to manage admin user:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
