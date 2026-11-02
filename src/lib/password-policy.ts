/**
 * Password rules, strength scoring and the security-question helpers used by
 * both the client (live feedback) and the server (enforcement). Pure module —
 * safe to import from client components and route handlers alike.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 120;

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was your first job?",
  "What is your favourite street food?",
  "What elementary school did you attend?",
  "What is your favourite basketball team?",
  "What is the name of your best friend in childhood?",
];

/** Reject the passwords that attackers try first. */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "1234567890",
  "12345678910",
  "qwertyuiop",
  "qwerty123",
  "iloveyou",
  "admin123",
  "administrator",
  "letmein123",
  "welcome123",
  "sarisaristore",
  "tindahanpos",
  "cashier123",
  "asdfghjkl",
  "1111111111",
  "0000000000",
  "batman123",
  "superman123",
  "philippines",
  "iloveyou123",
]);

export type PasswordCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export function passwordChecks(password: string): PasswordCheck[] {
  const lower = password.toLowerCase();
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      ok: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "case",
      label: "Upper and lower case letters",
      ok: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "At least one number",
      ok: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "At least one symbol (!@#$…)",
      ok: /[^A-Za-z0-9]/.test(password),
    },
    {
      id: "common",
      label: "Not a commonly used password",
      ok: password.length > 0 && !COMMON_PASSWORDS.has(lower),
    },
  ];
}

/** Human-readable list of everything still missing. Empty means it passes. */
export function passwordProblems(password: string): string[] {
  return passwordChecks(password)
    .filter((check) => !check.ok)
    .map((check) => check.label);
}

export function isStrongPassword(password: string): boolean {
  return passwordProblems(password).length === 0;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
};

export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { score: 0, label: "Very weak" };

  const checks = passwordChecks(password);
  let score = checks.filter((check) => check.ok).length; // 0..5

  // Reward extra length, but never let a leaked/common password score high.
  if (password.length >= 14) score += 1;
  if (!checks.find((check) => check.id === "common")?.ok) score = Math.min(score, 1);

  const bounded = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;
  const labels: PasswordStrength["label"][] = [
    "Very weak",
    "Weak",
    "Fair",
    "Strong",
    "Very strong",
  ];
  return { score: bounded, label: labels[bounded] };
}

/**
 * Answers are case/whitespace-insensitive so honest users can still recover
 * while the stored form stays a one-way hash.
 */
export function normalizeSecurityAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, " ").toLowerCase();
}
