import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePayment = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [isProcessing, setIsProcessing] = useState(false);

  const processPayment = async (
    participantId: string,
    recipientAddress: string,
    amount: number,
    currency: "SOL" | "USDC",
    splitId: string
  ) => {
    if (!publicKey || !sendTransaction) {
      toast.error("Please connect your wallet");
      return null;
    }

    setIsProcessing(true);
    try {
      const recipientPubKey = new PublicKey(recipientAddress);
      let signature: string;

      if (currency === "SOL") {
        // SOL transfer
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPubKey,
            lamports: amount * LAMPORTS_PER_SOL,
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        signature = await sendTransaction(transaction, connection);
        toast.info("Transaction sent. Waiting for confirmation...");

        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");
      } else {
        // USDC transfer (SPL Token)
        // USDC Devnet mint: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
        const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
        const decimals = 6; // USDC has 6 decimals

        const fromTokenAccount = await getAssociatedTokenAddress(
          usdcMint,
          publicKey
        );

        const toTokenAccount = await getAssociatedTokenAddress(
          usdcMint,
          recipientPubKey
        );

        const transaction = new Transaction().add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            publicKey,
            amount * Math.pow(10, decimals),
            [],
            TOKEN_PROGRAM_ID
          )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        signature = await sendTransaction(transaction, connection);
        toast.info("Transaction sent. Waiting for confirmation...");

        await connection.confirmTransaction(signature, "confirmed");
      }

      // Verify transaction on-chain
      const txInfo = await connection.getTransaction(signature, {
        commitment: "confirmed",
      });

      if (!txInfo) {
        throw new Error("Transaction not found");
      }

      // Update participant status
      const { error: participantError } = await supabase
        .from("participants")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          transaction_signature: signature,
        })
        .eq("id", participantId);

      if (participantError) throw participantError;

      // Insert payment history
      const { error: historyError } = await supabase
        .from("payment_history")
        .insert({
          split_id: splitId,
          participant_id: participantId,
          wallet_address: publicKey.toBase58(),
          amount: amount,
          currency: currency,
          transaction_signature: signature,
          status: "completed",
        });

      if (historyError) throw historyError;

      // Check if all participants have paid
      const { data: allParticipants, error: checkError } = await supabase
        .from("participants")
        .select("paid")
        .eq("split_id", splitId);

      if (checkError) throw checkError;

      const allPaid = allParticipants?.every(p => p.paid) ?? false;

      // If all participants have paid, update split status to completed
      if (allPaid) {
        const { error: splitError } = await supabase
          .from("splits")
          .update({ status: "completed" })
          .eq("id", splitId);

        if (splitError) throw splitError;
      }

      toast.success("Payment completed successfully!");
      return signature;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processPayment, isProcessing };
};
