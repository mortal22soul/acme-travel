import { describe, expect, it } from "vitest";
import { checkPassword, hashPassword, validatePasswordStrength } from "@/utils/pass";

describe("password security helpers", () => {
  it("reports every unmet password requirement", () => {
    expect(validatePasswordStrength("weak")).toEqual({
      isValid: false,
      requirements: expect.arrayContaining([
        "Password must be at least 8 characters long",
        "Password must contain at least one uppercase letter",
        "Password must contain at least one number",
        "Password must contain at least one special character",
      ]),
    });
  });

  it("accepts a strong password and verifies its bcrypt hash", async () => {
    const password = "SafePassword1!";
    expect(validatePasswordStrength(password).isValid).toBe(true);
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    await expect(checkPassword(password, hash)).resolves.toBe(true);
    await expect(checkPassword("WrongPassword1!", hash)).resolves.toBe(false);
  });
});
