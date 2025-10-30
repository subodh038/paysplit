import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Participant {
  id?: string;
  wallet_address: string;
  amount: number;
  paid: boolean;
  transaction_signature?: string | null;
  paid_at?: string | null;
}

interface Split {
  id: string;
  title: string;
  landlord_address: string;
  total_amount: number;
  currency: "SOL" | "USDC";
  due_date: string;
  status: string;
  created_by: string;
  participants?: Participant[];
}

export const useSplits = () => {
  const { publicKey } = useWallet();
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSplits = async () => {
    if (!publicKey) {
      setSplits([]);
      setLoading(false);
      return;
    }

    try {
      const walletAddress = publicKey.toBase58();
      
      const { data: splitsData, error: splitsError } = await supabase
        .from("splits")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (splitsError) throw splitsError;

      // Fetch participants for each split
      const splitsWithParticipants = await Promise.all(
        (splitsData || []).map(async (split) => {
          const { data: participants, error: participantsError } = await supabase
            .from("participants")
            .select("*")
            .eq("split_id", split.id);

          if (participantsError) throw participantsError;

          return {
            ...split,
            currency: split.currency as "SOL" | "USDC",
            participants: participants || [],
          };
        })
      );

      // Filter splits to only show those where the connected wallet is creator or participant
      const userSplits = splitsWithParticipants.filter(split => {
        const isCreator = split.created_by === walletAddress;
        const isParticipant = split.participants?.some(
          p => p.wallet_address === walletAddress
        );
        return isCreator || isParticipant;
      });

      setSplits(userSplits);
    } catch (error: any) {
      console.error("Error fetching splits:", error);
      toast.error("Failed to load splits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSplits();

    if (!publicKey) {
      return;
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel("splits-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "splits",
        },
        () => {
          fetchSplits();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
        },
        () => {
          fetchSplits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicKey]);

  return { splits, loading, refetch: fetchSplits };
};
