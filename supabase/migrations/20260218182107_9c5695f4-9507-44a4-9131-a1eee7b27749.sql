
-- Create login_history table
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  ip_address TEXT DEFAULT 'unknown',
  user_agent TEXT DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own login history
CREATE POLICY "Users can view own login history"
ON public.login_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own login history
CREATE POLICY "Users can insert own login history"
ON public.login_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_created_at ON public.login_history(created_at DESC);
