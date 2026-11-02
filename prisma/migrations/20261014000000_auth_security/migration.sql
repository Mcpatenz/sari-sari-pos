-- Self-service recovery + brute-force protection for user accounts.

ALTER TABLE "User"
  ADD COLUMN "securityQuestion" TEXT,
  ADD COLUMN "securityAnswerHash" TEXT,
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);
