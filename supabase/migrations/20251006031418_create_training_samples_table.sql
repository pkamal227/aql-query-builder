/*
  # Create training_samples table for storing user-provided query examples

  1. New Tables
    - `training_samples`
      - `id` (uuid, primary key) - Unique identifier for each training sample
      - `sample_type` (text) - Type of sample: 'query', 'sigma_rule', 'log_snippet'
      - `content` (text) - The actual sample content (query, rule, or log)
      - `description` (text, nullable) - Optional user description of what this sample does
      - `created_at` (timestamptz) - When the sample was added
      - `updated_at` (timestamptz) - When the sample was last modified
      - `session_id` (text, nullable) - Optional session identifier for grouping samples
      
  2. Security
    - Enable RLS on `training_samples` table
    - Allow anonymous access for read/write (since no auth system in place)
    - In production, you would restrict to authenticated users only

  3. Indexes
    - Index on created_at for efficient ordering
    - Index on sample_type for filtering by type
*/

CREATE TABLE IF NOT EXISTS training_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_type text NOT NULL CHECK (sample_type IN ('query', 'sigma_rule', 'log_snippet')),
  content text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  session_id text
);

-- Enable RLS
ALTER TABLE training_samples ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo purposes
-- NOTE: In production, restrict to authenticated users
CREATE POLICY "Allow anonymous read access"
  ON training_samples
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert"
  ON training_samples
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update"
  ON training_samples
  FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous delete"
  ON training_samples
  FOR DELETE
  TO anon
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_training_samples_created_at 
  ON training_samples(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_samples_type 
  ON training_samples(sample_type);

CREATE INDEX IF NOT EXISTS idx_training_samples_session 
  ON training_samples(session_id) 
  WHERE session_id IS NOT NULL;