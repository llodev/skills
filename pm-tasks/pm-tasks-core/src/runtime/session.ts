import { randomBytes } from "node:crypto";

export function generateSession(): string {
  // 8 bytes → 64-bit unsigned int → base36 → pad to 12 chars
  // (8 bytes give 64 bits ≈ 12.4 base36 digits; slice(0, 12) trims overflow)
  const big = randomBytes(8).readBigUInt64BE();
  return big.toString(36).padStart(12, "0").slice(0, 12);
}
