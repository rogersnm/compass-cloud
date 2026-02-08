import { randomBytes } from "crypto";

const USER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateDeviceCode(): string {
  return randomBytes(32).toString("hex");
}

export function generateUserCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += USER_CODE_CHARS[bytes[i] % USER_CODE_CHARS.length];
    if (i === 3) code += "-";
  }
  return code;
}
