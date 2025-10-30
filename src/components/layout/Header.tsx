import { WalletAuthButton } from "@/components/auth/WalletAuthButton";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">PaySplit</h1>
        </div>
        
        <WalletAuthButton />
      </div>
    </header>
  );
};
