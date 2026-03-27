
-- Setup SQL for Supabase

-- Ward AQI Table
CREATE TABLE IF NOT EXISTS ward_aqi (
  ward_name TEXT PRIMARY KEY,
  aqi INTEGER NOT NULL,
  status TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  priority_score INTEGER,
  population_density TEXT,
  sensor_coverage INTEGER,
  data_confidence TEXT,
  data_source TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
);

-- Enable RLS
ALTER TABLE ward_aqi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON ward_aqi FOR SELECT USING (true);
CREATE POLICY "Allow service role all access" ON ward_aqi FOR ALL USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Complaints Table (full schema with credibility fields)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  ward TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'Reported',
  intensity TEXT NOT NULL DEFAULT 'Medium',
  responsible_dept TEXT,
  sla_remaining TEXT DEFAULT '24h',
  verification_photo TEXT,
  -- ── Credibility & Evidence Fields ──────────────────────────────────────────
  reporter_user_id TEXT,          -- pseudonymous user ID (e.g. U-9A1F3B)
  auth_method TEXT,               -- e.g. 'Phone Verified + Google'
  trust_score DOUBLE PRECISION,   -- 0.0 – 1.0
  lat DOUBLE PRECISION,           -- GPS latitude at time of report
  lng DOUBLE PRECISION,           -- GPS longitude at time of report
  evidence_files TEXT[],          -- array of filenames / storage keys
  aqi_at_submission INTEGER,      -- ambient AQI logged when report was filed
  integrity_hash TEXT             -- SHA-256 fingerprint of the payload
);

-- RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for complaints" ON complaints
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for complaints" ON complaints
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for complaints" ON complaints
  FOR UPDATE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Run this block IF the complaints table already exists
-- and you need to add the new credibility columns.
-- Safe to run multiple times (IF NOT EXISTS guard on each column).
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
