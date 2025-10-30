import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import bs58 from "bs58";

export const useWalletAuth = () => {
  const { publicKey, signMessage, connected } = useWallet();
  const { toast } = useToast();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const authenticate = async () => {
    if (!connected || !publicKey || !signMessage) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);

    try {
      // Create message to sign
      const message = `Sign this message to authenticate with PaySplit.\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);
      
      // Request signature from wallet
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // Call edge function to verify and create session
      const { data, error } = await supabase.functions.invoke('wallet-auth', {
        body: {
          walletAddress: publicKey.toBase58(),
          signature: signatureBase58,
          message,
        },
      });

      if (error) throw error;

      if (data?.session) {
        // Set the session using the verification URL
        const url = new URL(data.session.properties.action_link);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');

        if (token && type) {
          const { error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as any,
          });

          if (sessionError) throw sessionError;

          toast({
            title: "Authentication successful",
            description: "You are now signed in with your wallet",
          });
          
          setIsAuthenticated(true);
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication failed",
        description: error.message || "Failed to authenticate with wallet",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    toast({
      title: "Signed out",
      description: "You have been signed out",
    });
  };

  return {
    authenticate,
    signOut,
    isAuthenticating,
    isAuthenticated,
  };
};
