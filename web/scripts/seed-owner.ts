import { connectDb } from "../src/lib/db/connect";
import { User } from "../src/lib/db/models/user";
import bcrypt from "bcryptjs";

export async function seedOwner() {
  await connectDb();
  
  const email = process.env.OWNER_EMAIL || "orders@ligerascents.com";
  const password = process.env.OWNER_PASSWORD || "change-me";
  const name = process.env.OWNER_NAME || "Owner";
  
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return existing;
  }
  
  const passwordHash = await bcrypt.hash(password, 12);
  const owner = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "owner",
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
  });
  
  return owner;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedOwner()
    .then(() => {
      console.log("Owner seeded");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
