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
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import upiQr from "@/assets/upi-qr.png";

const quickAmounts = [10, 25, 50, 100, 250, 500];

// USDT networks
const usdtNetworks = [
  { label: "USDT TRC20", network: "Tron (TRC20)", address: "TMgtTUTE6qNPAsqvbBsT3HRhKKiKSgFWRG" },
  { label: "USDT Base", network: "Base Chain", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
  { label: "USDT BNB Smart Chain", network: "BNB Smart Chain (BEP20)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
  { label: "USDT ERC20", network: "Ethereum (ERC20)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
  { label: "USDT SOL", network: "Solana (SPL)", address: "67FzTxrnNA7YpxndSTY6tqXLGwi8Z9a642dQXE2vRiLm" },
  { label: "USDT TON", network: "TON Network", address: "UQAsKnzp1kLJWIbIJWmr6dTCgF2_RHaPPsegj01JYnuXsuwV" },
  { label: "USDT ARB Chain", network: "Arbitrum (ARB)", address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108" },
];

// Other crypto
const otherCoins = [
  {
    key: "btc",
    label: "BTC",
    fullName: "Bitcoin",
    network: "Bitcoin (BTC) Network",
    address: "bc1qlezvg6gsuhumgdahwkuppn3tvnceaqqee37v3q",
    color: "#F7931A",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="currentColor">
        <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm7.189 18.956c-.31 1.243-1.163 2.07-2.414 2.414l.313 1.252-1.252.313-.313-1.252c-.313.078-.626.156-.939.156l.313 1.252-1.252.313-.313-1.252c-.391.078-.782.156-1.173.156H14.5l-.469-1.878h.782c.391 0 .782-.313.86-.782l.939-3.756c.078-.469-.156-.782-.547-.782H15l.469-1.878h1.565c.313 0 .626-.234.704-.547l.86-3.443h1.252l-.86 3.443h.939l.86-3.443h1.252l-.86 3.443c1.565.469 2.17 1.408 1.956 2.729z" fill="#F7931A"/>
      </svg>
    ),
  },
  {
    key: "eth",
    label: "ETH",
    fullName: "Ethereum",
    network: "Ethereum (ETH) Network",
    address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108",
    color: "#627EEA",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <path d="M16 5.5L9.5 16.5L16 20.5L22.5 16.5L16 5.5Z" fill="white" fillOpacity="0.8"/>
        <path d="M9.5 17.5L16 21.5L22.5 17.5L16 26.5L9.5 17.5Z" fill="white"/>
      </svg>
    ),
  },
  {
    key: "trx",
    label: "TRX",
    fullName: "TRON",
    network: "Tron (TRX) Network",
    address: "TMgtTUTE6qNPAsqvbBsT3HRhKKiKSgFWRG",
    color: "#EF0027",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <circle cx="16" cy="16" r="16" fill="#EF0027"/>
        <path d="M22 10L10 14l5 2.5L22 10zm-7 7l-5-2.5 2 8 3-5.5z" fill="white"/>
      </svg>
    ),
  },
  {
    key: "bnb",
    label: "BNB",
    fullName: "BNB",
    network: "BNB Smart Chain (BSC)",
    address: "0x9bf1e0fce442ce4b29f587b77a80b4711e0b9108",
    color: "#F3BA2F",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
        <path d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.26L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.188-.002h.002L16 13.706l-1.56 1.56-.18.18-.38.38.002.002L16 18.294l2.294-2.294-.002-.002z" fill="white"/>
      </svg>
    ),
  },
  {
    key: "xrp",
    label: "XRP",
    fullName: "XRP",
    network: "XRP Ledger (XRP) Network",
    address: "rJWLaPxrxfwVCiv9gbcoiTBeApte6pSro",
    color: "#00AAE4",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <circle cx="16" cy="16" r="16" fill="#00AAE4"/>
        <path d="M22 9h2.5l-5.5 5.5a4.24 4.24 0 01-6 0L7.5 9H10l4 4a1.76 1.76 0 002.5 0L20 9zm-12 14H7.5L13 17.5a4.24 4.24 0 016 0L24.5 23H22l-4-4a1.76 1.76 0 00-2.5 0L10 23z" fill="white"/>
      </svg>
    ),
  },
  {
    key: "ltc",
    label: "LTC",
    fullName: "Litecoin",
    network: "Litecoin (LTC) Network",
    address: "ltc1qpenmdhl4e8g7mv7vr06cu9p5trv94dmwnj73nv",
    color: "#BFBBBB",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <circle cx="16" cy="16" r="16" fill="#BFBBBB"/>
        <path d="M11 22h10v1.5H11zm1-2l4.5-8 1.5 .6-4.5 8zm-1-6l1.5-.6.5-1.5-1.5.6z" fill="white"/>
        <text x="10" y="21" fontSize="11" fill="white" fontWeight="bold">Ł</text>
      </svg>
    ),
  },
  {
    key: "ton",
    label: "TON",
    fullName: "Toncoin",
    network: "TON Network",
    address: "UQAsKnzp1kLJWIbIJWmr6dTCgF2_RHaPPsegj01JYnuXsuwV",
    color: "#0088CC",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <circle cx="16" cy="16" r="16" fill="#0088CC"/>
        <path d="M16 7l-8 5v8l8 5 8-5v-8L16 7zm0 2.3L22 13v6l-6 3.7L10 19v-6l6-3.7z" fill="white"/>
        <path d="M13 14l3 7 3-7H13z" fill="white"/>
      </svg>
    ),
  },
  {
    key: "sui",
    label: "SUI",
    fullName: "Sui",
    network: "Sui Network",
    address: "0x03b3e4700280ccf63f435a02f659ac10005d685ee9dcc20233c914acaa309e4f",
    color: "#4DA2FF",
    icon: (
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
        <circle cx="16" cy="16" r="16" fill="#4DA2FF"/>
        <path d="M16 8c-1.5 0-2.7 1.2-2.7 2.7 0 .8.4 1.6.9 2.1L16 15l1.8-2.2c.6-.6.9-1.3.9-2.1C18.7 9.2 17.5 8 16 8zm-4 10.5c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.2-.5-2.3-1.4-3L16 13.5l-2.6 2c-.9.7-1.4 1.8-1.4 3z" fill="white"/>
      </svg>
    ),
  },
];

// USDT icon SVG
const UsdtIcon = () => (
  <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
    <circle cx="16" cy="16" r="16" fill="#26A17B"/>
    <path d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V9H8.595v2.427h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.126 0 1.053 3.309 1.924 7.709 2.126v7.605h3.913v-7.61c4.393-.202 7.694-1.073 7.694-2.122 0-1.047-3.301-1.92-7.694-2.124" fill="white"/>
  </svg>
);

const AddFunds = () => {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("crypto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [uploadedProof, setUploadedProof] = useState<File | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [usdtExpanded, setUsdtExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, wallet, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, formatPrice, currencySymbol } = useLocalization();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
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
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount: parseFloat(amount),
        status: "pending",
        payment_method: selectedMethod,
        description: `${t("Deposit via")} ${selectedMethod.toUpperCase()}`,
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
                <TabsContent value="crypto" className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("Send cryptocurrency to one of the addresses below. Your balance will be credited after confirmation.")}
                  </p>

                  {/* USDT - Expandable */}
                  <div className="rounded-xl border border-border/40 overflow-hidden bg-secondary/10">
                    <button
                      onClick={() => setUsdtExpanded(!usdtExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#26A17B]/15 flex items-center justify-center">
                          <UsdtIcon />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">USDT – Tether</p>
                          <p className="text-xs text-muted-foreground">{usdtNetworks.length} networks available</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-[#26A17B]/10 text-[#26A17B] border-[#26A17B]/20">
                          Multi-chain
                        </Badge>
                        {usdtExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {usdtExpanded && (
                      <div className="border-t border-border/30 divide-y divide-border/20">
                        {usdtNetworks.map((net, i) => (
                          <div key={i} className="p-4 bg-secondary/5 hover:bg-secondary/15 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{net.label}</p>
                                <p className="text-xs text-muted-foreground mb-1">{net.network}</p>
                                <p className="text-xs font-mono text-primary break-all leading-relaxed">{net.address}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-8 w-8"
                                onClick={() => handleCopy(net.address, `usdt-${i}`)}
                              >
                                {copiedKey === `usdt-${i}` ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Other Coins */}
                  <div className="grid gap-3">
                    {otherCoins.map((coin) => (
                      <div key={coin.key} className="flex items-start justify-between p-4 rounded-xl bg-secondary/10 border border-border/30 hover:bg-secondary/20 transition-colors gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${coin.color}20` }}
                          >
                            {coin.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-foreground">{coin.label}</p>
                              <span className="text-xs text-muted-foreground">–</span>
                              <p className="text-xs text-muted-foreground">{coin.fullName}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{coin.network}</p>
                            <p className="text-xs font-mono text-primary break-all leading-relaxed">{coin.address}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8"
                          onClick={() => handleCopy(coin.address, coin.key)}
                        >
                          {copiedKey === coin.key ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
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
                          alt="UPI QR Code - Tanishq Saluja"
                          className="w-52 h-52 object-contain"
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

        {/* Right Column - Transaction History */}
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
