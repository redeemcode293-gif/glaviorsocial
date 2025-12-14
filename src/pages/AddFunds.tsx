import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet,
  CreditCard,
  Bitcoin,
  Smartphone,
  Copy,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  QrCode,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const transactions = [
  { id: "TXN-5678", type: "deposit", amount: 100.00, method: "Crypto (USDT)", status: "completed", date: "2024-01-15 14:30" },
  { id: "TXN-5677", type: "order", amount: -25.50, method: "Order #ORD-8934", status: "completed", date: "2024-01-15 14:32" },
  { id: "TXN-5676", type: "deposit", amount: 50.00, method: "Card Payment", status: "completed", date: "2024-01-14 10:15" },
  { id: "TXN-5675", type: "order", amount: -40.00, method: "Order #ORD-8933", status: "completed", date: "2024-01-14 12:20" },
  { id: "TXN-5674", type: "refund", amount: 8.00, method: "Refund #ORD-8929", status: "completed", date: "2024-01-14 18:50" },
  { id: "TXN-5673", type: "deposit", amount: 200.00, method: "UPI Transfer", status: "pending", date: "2024-01-15 16:00" },
];

const quickAmounts = [10, 25, 50, 100, 250, 500];

const cryptoAddresses = {
  usdt: "TRC20: TYdB1j8sCL...",
  btc: "bc1qxy2kgdygjr...",
  eth: "0x742d35Cc6634...",
};

const AddFunds = () => {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("crypto");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const balance = 125.50;

  const handleAddFunds = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Payment Initiated",
        description: `Please complete the payment of $${amount}.`,
      });
    }, 1000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard.",
    });
  };

  return (
    <DashboardLayout title="Add Funds" subtitle="Top up your wallet balance">
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Left Column - Add Funds */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Balance */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-4xl font-display font-bold text-gradient-cyan">${balance.toFixed(2)}</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-display">Select Payment Method</CardTitle>
              <CardDescription>Choose your preferred payment method</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={selectedMethod} onValueChange={setSelectedMethod}>
                <TabsList className="grid grid-cols-3 bg-secondary/30">
                  <TabsTrigger value="crypto" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Bitcoin className="h-4 w-4 mr-2" />
                    Crypto
                  </TabsTrigger>
                  <TabsTrigger value="card" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Card
                  </TabsTrigger>
                  <TabsTrigger value="upi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Smartphone className="h-4 w-4 mr-2" />
                    UPI
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="crypto" className="mt-6 space-y-4">
                  <div className="grid gap-3">
                    {Object.entries(cryptoAddresses).map(([coin, address]) => (
                      <div key={coin} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bitcoin className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground uppercase">{coin}</p>
                            <p className="text-xs text-muted-foreground font-mono">{address}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(address)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send exact amount to the address above. Funds will be credited after 2 confirmations.
                  </p>
                </TabsContent>

                <TabsContent value="card" className="mt-6 space-y-4">
                  <div className="p-8 rounded-lg bg-secondary/10 border border-border/30 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Secure card payment via Stripe</p>
                    <Button className="w-full max-w-xs">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Pay with Card
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="upi" className="mt-6 space-y-4">
                  <div className="p-8 rounded-lg bg-secondary/10 border border-border/30 text-center">
                    <QrCode className="h-24 w-24 text-primary mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">Scan QR code to pay</p>
                    <p className="text-xs text-muted-foreground">UPI ID: payments@glavior</p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Amount Input */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <Label>Amount to Add</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 bg-secondary/30 border-border/30 text-lg"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(amt.toString())}
                      className={`border-border/50 ${amount === amt.toString() ? 'border-primary bg-primary/10' : ''}`}
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>
                <Button 
                  className="w-full h-12 text-base"
                  onClick={handleAddFunds}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : `Add $${amount || '0'} to Wallet`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Transaction History */}
        <div className="space-y-6">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-display">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {transactions.slice(0, 5).map((txn) => (
                <div 
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      txn.type === 'deposit' ? 'bg-success/10 text-success' :
                      txn.type === 'refund' ? 'bg-primary/10 text-primary' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {txn.type === 'deposit' || txn.type === 'refund' ? 
                        <ArrowDownLeft className="h-4 w-4" /> : 
                        <ArrowUpRight className="h-4 w-4" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{txn.method}</p>
                      <p className="text-xs text-muted-foreground">{txn.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-medium ${txn.amount > 0 ? 'text-success' : 'text-foreground'}`}>
                      {txn.amount > 0 ? '+' : ''}{txn.amount.toFixed(2)}
                    </p>
                    {txn.status === 'pending' && (
                      <Badge variant="outline" className="text-[9px] mt-1">
                        <Clock className="h-2 w-2 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-sm text-primary">
                View All Transactions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddFunds;