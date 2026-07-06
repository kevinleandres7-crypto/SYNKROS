-- SYNKROS Supabase Database Setup
-- Execute this SQL in your Supabase SQL Editor

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON schedules(start_time);

-- Enable Row Level Security (RLS)
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own schedules"
  ON schedules FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own schedules"
  ON schedules FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own schedules"
  ON schedules FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON schedules FOR DELETE
  USING (auth.uid()::text = user_id);

-- Enable Realtime for schedules table
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
