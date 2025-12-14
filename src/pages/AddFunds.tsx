import { useState, useEffect } from "react";
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
  ExternalLink,
  Upload,
  Image
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const quickAmounts = [10, 25, 50, 100, 250, 500];

const cryptoAddresses = {
  usdt: { network: "TRC20", address: "TYdB1j8sCL8dpNkP5QK9cAh7H3mwKVYrZy" },
  btc: { network: "Bitcoin", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
  sol: { network: "Solana", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" },
};

const AddFunds = () => {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("crypto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [uploadedProof, setUploadedProof] = useState<File | null>(null);
  const [upiId, setUpiId] = useState("");
  const { toast } = useToast();
  const { user, wallet, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoadingTransactions(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setTransactions(data);
    }
    setLoadingTransactions(false);
  };

  const handleAddFunds = async () => {
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in to add funds.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create pending transaction
      const { data: txn, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: parseFloat(amount),
          status: 'pending',
          payment_method: selectedMethod,
          description: `Deposit via ${selectedMethod.toUpperCase()}`,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Deposit Initiated",
        description: `Your deposit of $${amount} is pending verification. We'll credit your wallet once confirmed.`,
      });

      setAmount("");
      setUploadedProof(null);
      await fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate deposit.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard.",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedProof(file);
      toast({
        title: "Screenshot Uploaded",
        description: "Payment proof has been attached.",
      });
    }
  };

  const balance = Number(wallet?.balance || 0);

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
                  <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Upload className="h-4 w-4 mr-2" />
                    Manual
                  </TabsTrigger>
                  <TabsTrigger value="upi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Smartphone className="h-4 w-4 mr-2" />
                    UPI
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="crypto" className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Send cryptocurrency to the addresses below. Your balance will be credited after 2 confirmations.
                  </p>
                  <div className="grid gap-3">
                    {Object.entries(cryptoAddresses).map(([coin, data]) => (
                      <div key={coin} className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bitcoin className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground uppercase">{coin}</p>
                            <p className="text-xs text-muted-foreground">{data.network}</p>
                            <p className="text-xs text-primary font-mono truncate max-w-[200px]">{data.address}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(data.address)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-6 space-y-4">
                  <div className="p-6 rounded-lg bg-secondary/10 border border-border/30 space-y-4">
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
                      <h3 className="font-medium mb-2">Manual Payment Verification</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete payment via bank transfer or any method, then upload proof.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Upload Payment Proof</Label>
                      <div className="relative">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="bg-secondary/30 border-border/30"
                        />
                        {uploadedProof && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            {uploadedProof.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="upi" className="mt-6 space-y-4">
                  <div className="p-6 rounded-lg bg-secondary/10 border border-border/30 text-center space-y-4">
                    <QrCode className="h-32 w-32 text-primary mx-auto" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Scan QR code or use UPI ID</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-primary bg-primary/10 px-3 py-1 rounded font-mono">
                          payments@glavior
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy("payments@glavior")}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      After payment, enter your UPI transaction ID below
                    </p>
                    <Input
                      placeholder="Enter UPI Transaction ID"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="bg-secondary/30 border-border/30 max-w-xs mx-auto"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Amount Input */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <Label>Amount to Add (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10 bg-secondary/30 border-border/30 text-lg"
                    min="1"
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
                  disabled={isProcessing || !amount}
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Submit Deposit Request - ${amount || '0'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Deposits are manually verified. Your wallet will be credited within 24 hours after confirmation.
                </p>
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
              {loadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  Loading...
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                transactions.map((txn) => (
                  <div 
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        txn.type === 'deposit' || txn.type === 'refund' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {txn.type === 'deposit' || txn.type === 'refund' ? 
                          <ArrowDownLeft className="h-4 w-4" /> : 
                          <ArrowUpRight className="h-4 w-4" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {txn.description || txn.payment_method || txn.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-sm font-medium ${
                        Number(txn.amount) > 0 ? 'text-success' : 'text-foreground'
                      }`}>
                        {Number(txn.amount) > 0 ? '+' : ''}${Number(txn.amount).toFixed(2)}
                      </p>
                      {txn.status === 'pending' && (
                        <Badge variant="outline" className="text-[9px] mt-1">
                          <Clock className="h-2 w-2 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {txn.status === 'completed' && (
                        <Badge variant="default" className="text-[9px] mt-1 bg-success/20 text-success border-0">
                          <CheckCircle2 className="h-2 w-2 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
              <Button 
                variant="ghost" 
                className="w-full text-sm text-primary"
                onClick={() => navigate('/dashboard/transactions')}
              >
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