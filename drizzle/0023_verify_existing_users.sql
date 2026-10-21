-- Email verification is now enforced when an email transport is configured. Accounts created
-- before that never got a verification email, so treat them as verified rather than lock them out.
UPDATE "user" SET "emailVerified" = true WHERE "emailVerified" = false;
