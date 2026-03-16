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
  Bitcoin,
  Smartphone,
  Copy,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Upload,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import upiQr from "@/assets/upi-qr.png";

const quickAmounts = [10, 25, 50, 100, 250, 500];

// ─── Coin definitions ────────────────────────────────────────────────────────
type CoinOption = {
  key: string;
  symbol: string;
  name: string;
  color: string;
  logoUrl: string;
  chains: { label: string; address: string }[];
};

const coins: CoinOption[] = [
  {
    key: "usdt",
    symbol: "USDT",
    name: "Tether",
    color: "#26A17B",
    logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.svg",
    chains: [
      { label: "TRC20 (Tron)", address: "TMgtTUTE6qNPAsqvbBsT3HRhKKiKSgFWRG" },
      { label: "ERC20 (Ethereum)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "BEP20 (BNB Smart Chain)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "Base Chain", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "Arbitrum (ARB)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
      { label: "Solana (SPL)", address: "67FzTxrnNA7YpxndSTY6tqXLGwi8Z9a642dQXE2vRiLm" },
      { label: "TON Network", address: "UQAsKnzp1kLJWIbIJWmr6dTCgF2_RHaPPsegj01JYnuXsuwV" },
    ],
  },
  {
    key: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    color: "#F7931A",
    logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg",
    chains: [{ label: "Bitcoin Network", address: "bc1qlezvg6gsuhumgdahwkuppn3tvnceaqqee37v3q" }],
  },
  {
    key: "eth",
    symbol: "ETH",
    name: "Ethereum",
    color: "#627EEA",
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
    chains: [{ label: "Ethereum Network (ERC20)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" }],
  },
  {
    key: "trx",
    symbol: "TRX",
    name: "TRON",
    color: "#EF0027",
    logoUrl: "https://cryptologos.cc/logos/tron-trx-logo.svg",
    chains: [{ label: "Tron Network", address: "TMgtTUTE6qNPAsqvbBsT3HRhKKiKSgFWRG" }],
  },
  {
    key: "bnb",
    symbol: "BNB",
    name: "BNB",
    color: "#F3BA2F",
    logoUrl: "https://cryptologos.cc/logos/bnb-bnb-logo.svg",
    chains: [{ label: "BNB Smart Chain (BSC)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" }],
  },
  {
    key: "xrp",
    symbol: "XRP",
    name: "XRP",
    color: "#00AAE4",
    logoUrl: "https://cryptologos.cc/logos/xrp-xrp-logo.svg",
    chains: [{ label: "XRP Ledger", address: "rJWLaPxrxfwVCiv9gbcoiTBeApte6pSro" }],
  },
  {
    key: "ltc",
    symbol: "LTC",
    name: "Litecoin",
    color: "#A5A5A5",
    logoUrl: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg",
    chains: [{ label: "Litecoin Network", address: "ltc1qpenmdhl4e8g7mv7vr06cu9p5trv94dmwnj73nv" }],
  },
  {
    key: "ton",
    symbol: "TON",
    name: "Toncoin",
    color: "#0088CC",
    logoUrl: "https://cryptologos.cc/logos/toncoin-ton-logo.svg",
    chains: [{ label: "TON Network", address: "UQAsKnzp1kLJWIbIJWmr6dTCgF2_RHaPPsegj01JYnuXsuwV" }],
  },
  {
    key: "sui",
    symbol: "SUI",
    name: "Sui",
    color: "#4DA2FF",
    logoUrl: "https://cryptologos.cc/logos/sui-sui-logo.svg",
    chains: [{ label: "Sui Network", address: "0x03b3e4700280ccf63f435a02f659ac10005d685ee9dcc20233c914acaa309e4f" }],
  },
];

// Fallback colored circle with letter if logo fails
const CoinLogo = ({ coin, size = 10 }: { coin: CoinOption; size?: number }) => {
  const [err, setErr] = useState(false);
  const sz = `w-${size} h-${size}`;
  return err ? (
    <div
      className={`${sz} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
      style={{ backgroundColor: coin.color }}
    >
      {coin.symbol[0]}
    </div>
  ) : (
    <img
      src={coin.logoUrl}
      alt={coin.symbol}
      className={`${sz} rounded-full object-contain shrink-0`}
      style={{ background: `${coin.color}22` }}
      onError={() => setErr(true)}
    />
  );
};

const AddFunds = () => {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("crypto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [uploadedProof, setUploadedProof] = useState<File | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Crypto selector state
  const [selectedCoinKey, setSelectedCoinKey] = useState<string>("usdt");
  const [selectedChainIdx, setSelectedChainIdx] = useState<number>(0);
  const [coinDropOpen, setCoinDropOpen] = useState(false);

  const { toast } = useToast();
  const { user, wallet, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, formatPrice, currencySymbol } = useLocalization();

  const selectedCoin = coins.find((c) => c.key === selectedCoinKey) ?? coins[0];
  const selectedChain = selectedCoin.chains[selectedChainIdx] ?? selectedCoin.chains[0];

  // Reset chain index when coin changes
  const handleSelectCoin = (key: string) => {
    setSelectedCoinKey(key);
    setSelectedChainIdx(0);
    setCoinDropOpen(false);
  };

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoadingTransactions(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setTransactions(data);
    setLoadingTransactions(false);
  };

  const handleAddFunds = async () => {
    if (!user) {
      toast({ title: t("Not Authenticated"), description: t("Please sign in to add funds."), variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: t("Invalid Amount"), description: t("Please enter a valid amount."), variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const methodLabel =
        selectedMethod === "crypto"
          ? `${selectedCoin.symbol} – ${selectedChain.label}`
          : selectedMethod === "upi"
          ? "UPI"
          : "Manual";

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: parseFloat(amount),
        status: "pending",
        payment_method: methodLabel,
        description: `${t("Deposit via")} ${methodLabel}`,
      });
      if (error) throw error;
      toast({
        title: t("Deposit Initiated"),
        description: t(`Your deposit of ${formatPrice(parseFloat(amount))} is pending verification.`),
      });
      setAmount("");
      setUploadedProof(null);
      setUpiTransactionId("");
      await fetchTransactions();
    } catch (error: any) {
      toast({ title: t("Error"), description: error.message || t("Failed to initiate deposit."), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: t("Copied!"), description: t("Address copied to clipboard.") });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedProof(file);
      toast({ title: t("Screenshot Uploaded"), description: t("Payment proof has been attached.") });
    }
  };

  const balance = Number(wallet?.balance || 0);

  return (
    <DashboardLayout title={t("Add Funds")} subtitle={t("Top up your wallet balance")}>
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Balance Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("Current Balance")}</p>
                  <p className="text-4xl font-display font-bold text-gradient-cyan">{formatPrice(balance)}</p>
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
              <CardTitle className="text-lg font-display">{t("Select Payment Method")}</CardTitle>
              <CardDescription>{t("Choose your preferred payment method")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={selectedMethod} onValueChange={setSelectedMethod}>
                <TabsList className="grid grid-cols-3 bg-secondary/30">
                  <TabsTrigger value="crypto" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Bitcoin className="h-4 w-4 mr-2" />
                    {t("Crypto")}
                  </TabsTrigger>
                  <TabsTrigger value="upi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Smartphone className="h-4 w-4 mr-2" />
                    UPI
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Upload className="h-4 w-4 mr-2" />
                    {t("Manual")}
                  </TabsTrigger>
                </TabsList>

                {/* ===== CRYPTO TAB ===== */}
                <TabsContent value="crypto" className="mt-6 space-y-5">
                  <p className="text-sm text-muted-foreground">
                    {t("Select the coin and network you'll be sending from, then copy the address.")}
                  </p>

                  {/* Step 1 – Choose Coin */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Step 1 — Select Coin</Label>
                    <div className="relative">
                      <button
                        onClick={() => setCoinDropOpen(!coinDropOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CoinLogo coin={selectedCoin} size={8} />
                          <div className="text-left">
                            <span className="font-semibold text-foreground text-sm">{selectedCoin.symbol}</span>
                            <span className="text-muted-foreground text-sm ml-2">— {selectedCoin.name}</span>
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${coinDropOpen ? "rotate-180" : ""}`} />
                      </button>

                      {coinDropOpen && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl border border-border/40 bg-card shadow-xl overflow-hidden divide-y divide-border/20">
                          {coins.map((coin) => (
                            <button
                              key={coin.key}
                              onClick={() => handleSelectCoin(coin.key)}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left ${
                                selectedCoinKey === coin.key ? "bg-primary/10" : ""
                              }`}
                            >
                              <CoinLogo coin={coin} size={8} />
                              <div>
                                <span className="font-semibold text-sm text-foreground">{coin.symbol}</span>
                                <span className="text-xs text-muted-foreground ml-2">{coin.name}</span>
                              </div>
                              {selectedCoinKey === coin.key && (
                                <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2 – Choose Chain (only if multiple chains) */}
                  {selectedCoin.chains.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Step 2 — Select Network / Chain</Label>
                      <div className="grid gap-2">
                        {selectedCoin.chains.map((chain, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedChainIdx(idx)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left ${
                              selectedChainIdx === idx
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border/30 bg-secondary/10 hover:bg-secondary/20 text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: selectedChainIdx === idx ? selectedCoin.color : "hsl(var(--muted-foreground))" }}
                              />
                              <span className="text-sm font-medium">{chain.label}</span>
                            </div>
                            {selectedChainIdx === idx && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3 – Show Address */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {selectedCoin.chains.length > 1 ? "Step 3" : "Step 2"} — Deposit Address
                    </Label>
                    <div className="rounded-xl border border-border/40 bg-secondary/10 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <CoinLogo coin={selectedCoin} size={10} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {selectedCoin.symbol} — {selectedChain.label}
                          </p>
                          <p className="text-xs text-muted-foreground">Send only {selectedCoin.symbol} on this network</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 text-xs font-mono text-primary bg-primary/5 border border-primary/15 px-3 py-3 rounded-lg break-all leading-relaxed">
                          {selectedChain.address}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 h-12 w-12 border-primary/30"
                          onClick={() => handleCopy(selectedChain.address, "deposit-addr")}
                        >
                          {copiedKey === "deposit-addr" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-destructive/80 mt-3 flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        Only send {selectedCoin.symbol} to this address. Wrong network = lost funds.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* ===== UPI TAB ===== */}
                <TabsContent value="upi" className="mt-6 space-y-4">
                  <div className="p-6 rounded-xl bg-secondary/10 border border-border/30 space-y-5">
                    <div className="text-center">
                      <h3 className="font-semibold text-foreground mb-1">{t("Pay via UPI")}</h3>
                      <p className="text-sm text-muted-foreground">{t("Scan the QR code or use the UPI ID below")}</p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-border/20 inline-block">
                        <img
                          src={upiQr}
                          alt="UPI QR Code – Tanishq Saluja"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                    </div>

                    {/* UPI ID */}
                    <div className="space-y-2">
                      <p className="text-sm text-center text-muted-foreground">{t("UPI ID")}</p>
                      <div className="flex items-center justify-center gap-2">
                        <code className="text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg font-mono text-sm">
                          9693779042@omni
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleCopy("9693779042@omni", "upi-id")}
                        >
                          {copiedKey === "upi-id" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          {copiedKey === "upi-id" ? t("Copied!") : t("Copy")}
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border/20 pt-4 space-y-2">
                      <Label>{t("UPI Transaction ID (after payment)")}</Label>
                      <Input
                        placeholder={t("Enter your UPI Transaction ID")}
                        value={upiTransactionId}
                        onChange={(e) => setUpiTransactionId(e.target.value)}
                        className="bg-secondary/30 border-border/30"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Enter the transaction reference ID from your UPI app after completing payment.")}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* ===== MANUAL TAB ===== */}
                <TabsContent value="manual" className="mt-6 space-y-4">
                  <div className="p-6 rounded-xl bg-secondary/10 border border-border/30 space-y-4">
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
                      <h3 className="font-medium mb-2">{t("Manual Payment Verification")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("Complete payment via any method, then upload a screenshot as proof. Admin will verify and credit your wallet.")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Upload Payment Screenshot")}</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="bg-secondary/30 border-border/30"
                      />
                      {uploadedProof && (
                        <div className="flex items-center gap-2 text-sm text-green-500">
                          <CheckCircle2 className="h-4 w-4" />
                          {uploadedProof.name}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Amount Section */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <div className="space-y-2">
                  <Label>{t("Amount to Add (USD)")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                    <Input
                      type="number"
                      placeholder={t("Enter amount")}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30 text-lg"
                      min="1"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(amt.toString())}
                      className={`border-border/50 ${amount === amt.toString() ? "border-primary bg-primary/10" : ""}`}
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>

                {/* Summary pill */}
                {selectedMethod === "crypto" && amount && parseFloat(amount) > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <CoinLogo coin={selectedCoin} size={6} />
                    <span className="text-muted-foreground">Paying with</span>
                    <span className="font-semibold text-foreground">{selectedCoin.symbol}</span>
                    <span className="text-muted-foreground">on</span>
                    <span className="font-medium text-foreground">{selectedChain.label}</span>
                    <span className="ml-auto font-bold text-primary">{formatPrice(parseFloat(amount))}</span>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base"
                  onClick={handleAddFunds}
                  disabled={isProcessing || !amount}
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      {t("Processing...")}
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      {t("Submit Deposit Request")} — {formatPrice(parseFloat(amount) || 0)}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t("Deposits are manually verified. Your wallet will be credited within 24 hours after confirmation.")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column – Transaction History */}
        <div className="space-y-6">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-display">{t("Recent Transactions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingTransactions ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  {t("Loading...")}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t("No transactions yet")}</p>
                </div>
              ) : (
                transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          txn.type === "deposit" || txn.type === "refund"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {txn.type === "deposit" || txn.type === "refund" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{t(txn.type)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
                        {txn.payment_method && (
                          <p className="text-xs text-muted-foreground opacity-70">{txn.payment_method}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono text-sm font-medium ${
                          txn.type === "deposit" || txn.type === "refund" ? "text-green-500" : "text-foreground"
                        }`}
                      >
                        {txn.type === "deposit" || txn.type === "refund" ? "+" : ""}
                        {formatPrice(Math.abs(txn.amount))}
                      </p>
                      <Badge
                        variant={txn.status === "completed" ? "default" : txn.status === "pending" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {t(txn.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddFunds;
