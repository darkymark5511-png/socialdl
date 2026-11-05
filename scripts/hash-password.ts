#!/usr/bin/env tsx
/**
 * Generate a bcrypt hash for ADMIN_PASSWORD_HASH.
 *
 * Usage:
 *   npx tsx scripts/hash-password.ts "your-plain-password"
 *   npm run hash-password -- "your-plain-password"
 */

import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password || password.length < 8) {
  console.error("Usage: npx tsx scripts/hash-password.ts <password>");
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const rounds = 12;
const hash = bcrypt.hashSync(password, rounds);
console.log(hash);
console.log("\nSet this as ADMIN_PASSWORD_HASH in your environment.");
