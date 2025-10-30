import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HistoryItem {
  id: string;
  title: string;
  amount: number;
  currency: "SOL" | "USDC";
  status: "completed" | "cancelled" | "pending";
  date: string;
  participants: number;
}

export const usePaymentHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      // Fetch all completed or cancelled splits
      const { data, error } = await supabase
        .from("splits")
        .select(`
          id,
          title,
          total_amount,
          currency,
          status,
          created_at,
          participants ( id )
        `)
        .in("status", ["completed", "cancelled"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedHistory: HistoryItem[] = (data || []).map((split: any) => ({
        id: split.id,
        title: split.title,
        amount: parseFloat(split.total_amount),
        currency: split.currency,
        status: split.status,
        date: split.created_at,
        participants: split.participants ? split.participants.length : 0,
      }));

      setHistory(formattedHistory);
    } catch (err: any) {
      console.error("Error fetching payment history:", err);
      toast.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Real-time updates
    const channel = supabase
      .channel("splits-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "splits",
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { history, loading, refetch: fetchHistory };
};
