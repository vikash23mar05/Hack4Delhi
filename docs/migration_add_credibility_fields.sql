
-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION ONLY: Run this in the Supabase SQL Editor.
-- This adds the credibility columns to the existing complaints table.
-- Safe to run multiple times (IF NOT EXISTS guard on each column).
-- Do NOT re-run the full setup.sql — policies already exist.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='reporter_user_id') THEN
    ALTER TABLE complaints ADD COLUMN reporter_user_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='auth_method') THEN
    ALTER TABLE complaints ADD COLUMN auth_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='trust_score') THEN
    ALTER TABLE complaints ADD COLUMN trust_score DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='lat') THEN
    ALTER TABLE complaints ADD COLUMN lat DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='lng') THEN
    ALTER TABLE complaints ADD COLUMN lng DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='evidence_files') THEN
    ALTER TABLE complaints ADD COLUMN evidence_files TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='aqi_at_submission') THEN
    ALTER TABLE complaints ADD COLUMN aqi_at_submission INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='complaints' AND column_name='integrity_hash') THEN
    ALTER TABLE complaints ADD COLUMN integrity_hash TEXT;
  END IF;
END $$;

-- Also allow UPDATE (needed for status changes from the Authority Hub)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'complaints' AND policyname = 'Allow public update access for complaints'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public update access for complaints" ON complaints FOR UPDATE USING (true)';
  END IF;
END $$;
