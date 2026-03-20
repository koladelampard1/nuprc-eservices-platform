-- Ensure ApplicationDocument supports requirement-linked uploads.
ALTER TABLE "ApplicationDocument"
  ADD COLUMN IF NOT EXISTS "requirementId" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApplicationDocument_requirementId_fkey'
  ) THEN
    ALTER TABLE "ApplicationDocument"
      ADD CONSTRAINT "ApplicationDocument_requirementId_fkey"
      FOREIGN KEY ("requirementId")
      REFERENCES "ServiceDocumentRequirement"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ApplicationDocument_uploadedByUserId_fkey'
  ) THEN
    ALTER TABLE "ApplicationDocument"
      ADD CONSTRAINT "ApplicationDocument_uploadedByUserId_fkey"
      FOREIGN KEY ("uploadedByUserId")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ApplicationDocument_requirementId_idx"
  ON "ApplicationDocument"("requirementId");

CREATE INDEX IF NOT EXISTS "ApplicationDocument_applicationId_requirementId_uploadedAt_idx"
  ON "ApplicationDocument"("applicationId", "requirementId", "uploadedAt");
