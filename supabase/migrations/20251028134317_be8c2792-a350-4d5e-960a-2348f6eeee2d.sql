-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view splits" ON public.splits;
DROP POLICY IF EXISTS "Anyone can view participants" ON public.participants;

-- Create new restrictive policies for splits
-- Users can view splits where they are the creator OR a participant
CREATE POLICY "Users can view their own splits"
ON public.splits
FOR SELECT
USING (
  created_by = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)
  OR
  EXISTS (
    SELECT 1 FROM public.participants
    WHERE participants.split_id = splits.id
    AND participants.wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)
  )
);

-- Create new restrictive policy for participants
-- Users can view participants only for splits they're involved in
CREATE POLICY "Users can view participants of their splits"
ON public.participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.splits
    WHERE splits.id = participants.split_id
    AND (
      splits.created_by = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)
      OR
      EXISTS (
        SELECT 1 FROM public.participants p2
        WHERE p2.split_id = splits.id
        AND p2.wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)
      )
    )
  )
);