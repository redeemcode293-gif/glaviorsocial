import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string | null;
  description: string | null;
  created_at: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { t, formatPrice } = useLocalization();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: t("Error"),
          description: t("Failed to fetch transactions"),
          variant: "destructive",
        });
      } else {
        setTransactions(data || []);
      }
    }
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDeposits = transactions
    .filter(tx => tx.type === 'deposit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalSpent = transactions
    .filter(tx => tx.type === 'order' && tx.status === 'completed')
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case 'order':
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'refund':
      case 'referral_commission':
        return <ArrowDownLeft className="h-4 w-4 text-primary" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">{t("Completed")}</Badge>;
      case 'pending':
        return <Badge variant="gold">{t("Pending")}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t("Failed")}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: t("Deposit"),
      order: t("Order"),
      withdrawal: t("Withdrawal"),
      refund: t("Refund"),
      referral_commission: t("Referral Commission")
    };
    return labels[type] || t(type.replace('_', ' '));
  };

  return (
    <DashboardLayout title={t("Transactions")} subtitle={t("View your transaction history")}>
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("Total Deposits")}</p>
                  <p className="text-lg md:text-2xl font-display font-bold text-foreground truncate">{formatPrice(totalDeposits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("Total Spent")}</p>
                  <p className="text-lg md:text-2xl font-display font-bold text-foreground truncate">{formatPrice(totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("Total Transactions")}</p>
                  <p className="text-lg md:text-2xl font-display font-bold text-foreground">{transactions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-base md:text-lg font-display">{t("Transaction History")}</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("Search transactions...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-secondary/30 border-border/30 w-full sm:w-56 md:w-64 h-9 text-sm"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchTransactions} className="border-border/30 h-9 w-9">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t("No transactions yet")}</p>
                <p className="text-sm text-muted-foreground/70">{t("Your transaction history will appear here")}</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                            {getTypeIcon(tx.type)}
                          </div>
                          <span className="font-medium text-foreground">{getTypeLabel(tx.type)}</span>
                        </div>
                        {getStatusBadge(tx.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-medium ${
                          tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'referral_commission'
                            ? 'text-success' 
                            : 'text-destructive'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'referral_commission' ? '+' : '-'}
                          {formatPrice(Math.abs(Number(tx.amount)))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {tx.payment_method && (
                        <p className="text-xs text-muted-foreground">{t("Method")}: {tx.payment_method}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Type")}</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Amount")}</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Status")}</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Method")}</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                                {getTypeIcon(tx.type)}
                              </div>
                              <span className="font-medium text-foreground">{getTypeLabel(tx.type)}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`font-mono font-medium ${
                              tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'referral_commission'
                                ? 'text-success' 
                                : 'text-destructive'
                            }`}>
                              {tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'referral_commission' ? '+' : '-'}
                              {formatPrice(Math.abs(Number(tx.amount)))}
                            </span>
                          </td>
                          <td className="p-3">{getStatusBadge(tx.status)}</td>
                          <td className="p-3">
                            <span className="text-sm text-muted-foreground">{tx.payment_method || '-'}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
