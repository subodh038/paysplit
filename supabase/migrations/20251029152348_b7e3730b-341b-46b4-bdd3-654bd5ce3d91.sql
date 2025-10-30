-- Fix infinite recursion in RLS policies by using security definer functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own splits" ON public.splits;
DROP POLICY IF EXISTS "Users can view participants of their splits" ON public.participants;

-- Create security definer function to get user's wallet address
CREATE OR REPLACE FUNCTION public.get_user_wallet_address(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_address FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Create security definer function to check if user is split creator
CREATE OR REPLACE FUNCTION public.is_split_creator(_user_id uuid, _split_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.splits
    WHERE id = _split_id
    AND created_by = (SELECT wallet_address FROM public.profiles WHERE id = _user_id LIMIT 1)
  );
$$;

-- Create security definer function to check if user is split participant
CREATE OR REPLACE FUNCTION public.is_split_participant(_user_id uuid, _split_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.participants
    WHERE split_id = _split_id
    AND wallet_address = (SELECT wallet_address FROM public.profiles WHERE id = _user_id LIMIT 1)
  );
$$;

-- Recreate splits policy using security definer functions
CREATE POLICY "Users can view their own splits"
ON public.splits
FOR SELECT
USING (
  public.is_split_creator(auth.uid(), id)
  OR
  public.is_split_participant(auth.uid(), id)
);

-- Recreate participants policy using security definer functions
CREATE POLICY "Users can view participants of their splits"
ON public.participants
FOR SELECT
USING (
  public.is_split_creator(auth.uid(), split_id)
  OR
  public.is_split_participant(auth.uid(), split_id)
);