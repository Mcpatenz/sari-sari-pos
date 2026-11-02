// Resets a user's password directly against the database.
//
// Usage:
//   npm run reset-password -- <email> <newPassword>
//   npm run reset-password            # prompts for both
//
// It re-hashes the password with the same scrypt scheme the app uses and bumps
// the user's sessionVersion, which signs that account out everywhere.

import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";

// Load .env so DATABASE_URL is available (Node 20.12+).
try {
  process.loadEnvFile?.();
} catch {
  // .env is optional if the variables are already exported.
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function question(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const [emailArg, passwordArg] = process.argv.slice(2);

  const email = (emailArg || (await question("Email: "))).toLowerCase();
  const password = passwordArg || (await question("New password: "));

  if (!email) {
    console.error("An email is required.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No account found for ${email}.`);
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(password),
        active: true,
        sessionVersion: { increment: 1 },
      },
      select: { name: true, email: true, role: true, active: true },
    });

    console.log(`Password reset for ${updated.name} <${updated.email}> (${updated.role}).`);
    console.log("All existing sessions for this account were signed out.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Reset failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
