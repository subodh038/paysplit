import { useState } from "react";
import { Users, DollarSign, Clock } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/payment/PaymentDialog";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";

interface Participant {
  id: string;
  address: string;
  amount: number;
  paid: boolean;
}

interface SplitCardProps {
  id: string;
  title: string;
  totalAmount: number;
  landlordAddress: string;
  participants: Participant[];
  currency: "SOL" | "USDC";
  dueDate: string;
}

export const SplitCard = ({
  id,
  title,
  totalAmount,
  landlordAddress,
  participants,
  currency,
  dueDate,
}: SplitCardProps) => {
  const { publicKey, sendTransaction } = useWallet();
  const [released, setReleased] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    participantId: string;
    amount: number;
  }>({ open: false, participantId: "", amount: 0 });

  const paidCount = participants.filter((p) => p.paid).length;
  const progress = (paidCount / participants.length) * 100;
  const amountPaid = participants
    .filter((p) => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const userParticipant = participants.find(
    (p) => publicKey && p.address === publicKey.toBase58()
  );

  // 🪙 Handle pay click
  const handlePayClick = (participantId: string, amount: number) => {
    setPaymentDialog({ open: true, participantId, amount });
  };

  // 💸 Handle release funds
  const handleRelease = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      // Dummy transaction to simulate fund release
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(landlordAddress),
          lamports: 0, // 0 SOL - mock transfer
        })
      );

      const txSig = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(txSig, "confirmed");

      alert(`✅ Funds released successfully!\nTx Signature: ${txSig}`);
      setReleased(true); // Change button to "Released"
    } catch (err) {
      console.error("Release error:", err);
      alert("❌ Release failed — check console for details.");
    }
  };

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {participants.length} people
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Due {dueDate}
              </span>
            </CardDescription>
          </div>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {progress === 100 ? "Complete" : "Active"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Progress</span>
          <span className="text-sm font-medium">
            {paidCount}/{participants.length} paid
          </span>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="text-lg font-bold flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {totalAmount} {currency}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Collected</span>
            <span className="font-medium text-primary">
              {amountPaid.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        {/* Participant list */}
        <div className="pt-2 space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
            >
              <span className="font-mono text-xs">
                {participant.address.slice(0, 4)}...
                {participant.address.slice(-4)}
                {publicKey &&
                  participant.address === publicKey.toBase58() && (
                    <span className="ml-1 text-primary">(You)</span>
                  )}
              </span>
              <div className="flex items-center gap-2">
                <span>
                  {participant.amount} {currency}
                </span>
                <Badge
                  variant={participant.paid ? "default" : "outline"}
                  className="text-xs"
                >
                  {participant.paid ? "Paid" : "Pending"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action Buttons */}
        {userParticipant && !userParticipant.paid ? (
          <Button
            className="w-full"
            variant="default"
            onClick={() =>
              handlePayClick(userParticipant.id, userParticipant.amount)
            }
          >
            Pay {userParticipant.amount} {currency}
          </Button>
        ) : !participants.find((p) => !p.paid) ? (
          released ? (
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              disabled
            >
              ✅ Released
            </Button>
          ) : (
            <Button className="w-full" variant="default" onClick={handleRelease}>
              Release Funds
            </Button>
          )
        ) : (
          <Button className="w-full" variant="outline" disabled>
            {userParticipant?.paid
              ? "Payment Complete"
              : "Waiting for Payments"}
          </Button>
        )}
      </CardContent>

      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}
        participantId={paymentDialog.participantId}
        recipientAddress={landlordAddress}
        amount={paymentDialog.amount}
        currency={currency}
        splitId={id}
        splitTitle={title}
      />
    </Card>
  );
};
