-- 🔍 VERIFY DATABASE SETUP
-- Run this after the NUKE_AND_REBUILD_DATABASE.sql script

-- Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('frysen_families', 'frysen_data');

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'frysen_data'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('frysen_families', 'frysen_data');

-- Check real-time publication
SELECT 
  pubname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('frysen_families', 'frysen_data');

-- Test insert permissions (should work with permissive policies)
INSERT INTO frysen_families (family_id, name) 
VALUES ('test_family_123', 'Test Family')
ON CONFLICT (family_id) DO NOTHING;

INSERT INTO frysen_data (family_id, drawers, shopping_list, device_id) 
VALUES ('test_family_123', '{}', '[]', 'test_device')
ON CONFLICT (family_id) DO NOTHING;

-- Clean up test data
DELETE FROM frysen_data WHERE family_id = 'test_family_123';
DELETE FROM frysen_families WHERE family_id = 'test_family_123';

-- ✅ If no errors above, database is ready! 