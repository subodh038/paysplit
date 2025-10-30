-- Update RLS policies to allow public access without authentication

-- Drop existing policies on splits
DROP POLICY IF EXISTS "Anyone can create splits" ON public.splits;
DROP POLICY IF EXISTS "Creator can update their splits" ON public.splits;
DROP POLICY IF EXISTS "Users can view their own splits" ON public.splits;

-- Drop existing policies on participants
DROP POLICY IF EXISTS "Anyone can create participants" ON public.participants;
DROP POLICY IF EXISTS "Participants can update their own status" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants of their splits" ON public.participants;

-- Create new public policies for splits
CREATE POLICY "Public can create splits"
ON public.splits
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can view all splits"
ON public.splits
FOR SELECT
TO public
USING (true);

CREATE POLICY "Creator can update their splits by wallet"
ON public.splits
FOR UPDATE
TO public
USING (true);

-- Create new public policies for participants
CREATE POLICY "Public can create participants"
ON public.participants
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can view all participants"
ON public.participants
FOR SELECT
TO public
USING (true);

CREATE POLICY "Participants can update their status by wallet"
ON public.participants
FOR UPDATE
TO public
USING (true);

-- Update payment_history policies to be public
DROP POLICY IF EXISTS "Anyone can create payment records" ON public.payment_history;
DROP POLICY IF EXISTS "Anyone can view payment history" ON public.payment_history;

CREATE POLICY "Public can create payment records"
ON public.payment_history
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can view payment history"
ON public.payment_history
FOR SELECT
TO public
USING (true);