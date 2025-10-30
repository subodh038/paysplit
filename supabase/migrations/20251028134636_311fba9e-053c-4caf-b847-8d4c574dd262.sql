-- Create profiles table for wallet users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view all profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Add trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update splits RLS policies to use wallet_address from profiles
DROP POLICY IF EXISTS "Users can view their own splits" ON public.splits;
DROP POLICY IF EXISTS "Users can view participants of their splits" ON public.participants;

-- Create new policies that use wallet_address from profiles table
CREATE POLICY "Users can view their own splits"
ON public.splits
FOR SELECT
USING (
  created_by IN (
    SELECT wallet_address FROM public.profiles WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.split_id = splits.id
    AND participants.wallet_address IN (
      SELECT wallet_address FROM public.profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view participants of their splits"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.splits
    WHERE splits.id = participants.split_id
    AND (
      splits.created_by IN (
        SELECT wallet_address FROM public.profiles WHERE id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.participants p2
        WHERE p2.split_id = splits.id
        AND p2.wallet_address IN (
          SELECT wallet_address FROM public.profiles WHERE id = auth.uid()
        )
      )
    )
  )
);
