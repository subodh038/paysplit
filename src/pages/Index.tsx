import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { SplitCard } from "@/components/splits/SplitCard";
import { CreateSplitForm } from "@/components/splits/CreateSplitForm";
import { PaymentHistory } from "@/components/history/PaymentHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSplits } from "@/hooks/useSplits";

const Index = () => {
  const [activeTab, setActiveTab] = useState("active");
  const { splits, loading } = useSplits();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to PaySplit</h2>
          <p className="text-muted-foreground">
            Split rent and bills effortlessly on Solana with secure escrow
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="active">Active Splits</TabsTrigger>
            <TabsTrigger value="create">Create Split</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : splits.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {splits.map((split) => (
                  <SplitCard
                    key={split.id}
                    id={split.id}
                    title={split.title}
                    totalAmount={parseFloat(split.total_amount.toString())}
                    landlordAddress={split.landlord_address}
                    currency={split.currency}
                    dueDate={new Date(split.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    participants={
                      split.participants?.map((p) => ({
                        id: p.id || "",
                        address: p.wallet_address,
                        amount: parseFloat(p.amount.toString()),
                        paid: p.paid,
                      })) || []
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No active splits. Create one to get started!
              </div>
            )}
          </TabsContent>

          <TabsContent value="create">
            <div className="max-w-2xl mx-auto">
              <CreateSplitForm />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="max-w-3xl mx-auto">
              <PaymentHistory />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
