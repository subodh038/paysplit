import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePayment } from "@/hooks/usePayment";
import { Loader2, ExternalLink } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  recipientAddress: string;
  amount: number;
  currency: "SOL" | "USDC";
  splitId: string;
  splitTitle: string;
}

export const PaymentDialog = ({
  open,
  onOpenChange,
  participantId,
  recipientAddress,
  amount,
  currency,
  splitId,
  splitTitle,
}: PaymentDialogProps) => {
  const { processPayment, isProcessing } = usePayment();
  const [signature, setSignature] = useState<string | null>(null);

  const handlePayment = async () => {
    const txSignature = await processPayment(
      participantId,
      recipientAddress,
      amount,
      currency,
      splitId
    );

    if (txSignature) {
      setSignature(txSignature);
    }
  };

  const handleClose = () => {
    setSignature(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {signature ? "Payment Successful" : "Confirm Payment"}
          </DialogTitle>
          <DialogDescription>
            {signature
              ? "Your payment has been processed successfully"
              : `Pay for ${splitTitle}`}
          </DialogDescription>
        </DialogHeader>

        {!signature ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold">
                  {amount} {currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-mono text-xs">
                  {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-8)}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This transaction will be sent to the Solana network. Please
              confirm in your wallet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Transaction ID</p>
              <p className="font-mono text-xs break-all">{signature}</p>
              <a
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on Solana Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <DialogFooter>
          {!signature ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={handlePayment} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${amount} ${currency}`
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
