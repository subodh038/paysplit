import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Participant {
  address: string;
  amount: number;
}

export const CreateSplitForm = () => {
  const { publicKey } = useWallet();
  const [title, setTitle] = useState("");
  const [landlordAddress, setLandlordAddress] = useState("");
  const [currency, setCurrency] = useState<"SOL" | "USDC">("SOL");
  const [dueDate, setDueDate] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    { address: "", amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);

  const addParticipant = () => {
    setParticipants([...participants, { address: "", amount: 0 }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string | number) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const totalAmount = participants.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (participants.some(p => !p.address || !p.amount)) {
      toast.error("Please fill in all participant details");
      return;
    }

    setLoading(true);
    try {
      // Create the split
      const { data: splitData, error: splitError } = await supabase
        .from("splits")
        .insert({
          title,
          landlord_address: landlordAddress,
          total_amount: totalAmount,
          currency,
          due_date: dueDate,
          created_by: publicKey.toBase58(),
        })
        .select()
        .single();

      if (splitError) throw splitError;

      // Create participants
      const participantsData = participants.map((p) => ({
        split_id: splitData.id,
        wallet_address: p.address,
        amount: p.amount,
      }));

      const { error: participantsError } = await supabase
        .from("participants")
        .insert(participantsData);

      if (participantsError) throw participantsError;

      toast.success("Split room created successfully!");
      
      // Reset form
      setTitle("");
      setLandlordAddress("");
      setDueDate("");
      setParticipants([{ address: "", amount: 0 }]);
    } catch (error: any) {
      console.error("Error creating split:", error);
      toast.error("Failed to create split room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Create New Split</CardTitle>
        <CardDescription>
          Set up a new payment split room for rent or bills
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Split Title</Label>
            <Input
              id="title"
              placeholder="e.g., June Rent - Apartment 4B"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlord">Recipient Wallet Address</Label>
            <Input
              id="landlord"
              placeholder="Landlord's Solana wallet address"
              value={landlordAddress}
              onChange={(e) => setLandlordAddress(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={(value: "SOL" | "USDC") => setCurrency(value)}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Participants</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                <Plus className="w-4 h-4 mr-1" />
                Add Participant
              </Button>
            </div>

            {participants.map((participant, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Wallet address"
                  value={participant.address}
                  onChange={(e) => updateParticipant(index, "address", e.target.value)}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={participant.amount || ""}
                  onChange={(e) => updateParticipant(index, "amount", parseFloat(e.target.value))}
                  className="w-32"
                  required
                />
                {participants.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeParticipant(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-medium">Total Amount</span>
              <span className="text-xl font-bold text-primary">
                {totalAmount.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading || !publicKey}>
            {loading ? "Creating..." : "Create Split Room"}
          </Button>
          {!publicKey && (
            <p className="text-sm text-center text-muted-foreground">
              Connect your wallet to create a split
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
