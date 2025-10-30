-- Create splits table for storing split rooms
CREATE TABLE public.splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  landlord_address TEXT NOT NULL,
  total_amount DECIMAL NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('SOL', 'USDC')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table for tracking who needs to pay
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  split_id UUID NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  transaction_signature TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment history table
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  split_id UUID NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL,
  transaction_signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for splits (everyone can view and create)
CREATE POLICY "Anyone can view splits"
ON public.splits FOR SELECT
USING (true);

CREATE POLICY "Anyone can create splits"
ON public.splits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Creator can update their splits"
ON public.splits FOR UPDATE
USING (created_by = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for participants (everyone can view and update their own)
CREATE POLICY "Anyone can view participants"
ON public.participants FOR SELECT
USING (true);

CREATE POLICY "Anyone can create participants"
ON public.participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can update their own status"
ON public.participants FOR UPDATE
USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for payment history (everyone can view their own)
CREATE POLICY "Anyone can view payment history"
ON public.payment_history FOR SELECT
USING (true);

CREATE POLICY "Anyone can create payment records"
ON public.payment_history FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_splits_updated_at
BEFORE UPDATE ON public.splits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_participants_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;

-- Create indexes for better performance
CREATE INDEX idx_splits_created_by ON public.splits(created_by);
CREATE INDEX idx_splits_status ON public.splits(status);
CREATE INDEX idx_participants_split_id ON public.participants(split_id);
CREATE INDEX idx_participants_wallet_address ON public.participants(wallet_address);
CREATE INDEX idx_payment_history_split_id ON public.payment_history(split_id);
CREATE INDEX idx_payment_history_wallet_address ON public.payment_history(wallet_address);