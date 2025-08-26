-- 🚀 NUKE AND REBUILD DATABASE SCRIPT
-- Run this in Supabase SQL Editor to completely reset your database

-- 1. DROP EXISTING TABLES (if they exist)
DROP TABLE IF EXISTS frysen_data CASCADE;
DROP TABLE IF EXISTS frysen_families CASCADE;

-- 2. CREATE CLEAN TABLES
-- Tabell för familjer
CREATE TABLE frysen_families (
  family_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabell för synkroniserad data
CREATE TABLE frysen_data (
  family_id TEXT PRIMARY KEY REFERENCES frysen_families(family_id),
  drawers JSONB DEFAULT '{}',
  shopping_list JSONB DEFAULT '[]',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version TEXT DEFAULT '1.0.0',
  device_id TEXT -- För att spåra vilken enhet som gjorde ändringen
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE frysen_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE frysen_data ENABLE ROW LEVEL SECURITY;

-- 4. CREATE PERMISSIVE POLICIES (allow all operations for now)
CREATE POLICY "Allow all operations on families" ON frysen_families 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on data" ON frysen_data 
  FOR ALL USING (true) WITH CHECK (true);

-- 5. ENABLE REAL-TIME FOR BOTH TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE frysen_families;
ALTER PUBLICATION supabase_realtime ADD TABLE frysen_data;

-- 6. VERIFY SETUP
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('frysen_families', 'frysen_data');

-- 7. SHOW POLICIES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('frysen_families', 'frysen_data');

-- 8. VERIFY REAL-TIME PUBLICATION
SELECT 
  pubname,
  puballtables,
  pubinsert,
  pubupdate,
  pubdelete,
  pubtruncate
FROM pg_publication 
WHERE pubname = 'supabase_realtime';

SELECT 
  pubname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('frysen_families', 'frysen_data');

-- ✅ DATABASE REBUILT SUCCESSFULLY!
-- Now test your app with a fresh database 