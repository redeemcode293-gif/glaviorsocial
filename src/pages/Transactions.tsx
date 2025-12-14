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
  Filter,
  Download,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
          title: "Error",
          description: "Failed to fetch transactions",
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
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

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
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="gold">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Transactions" subtitle="View your transaction history">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-2xl font-display font-bold text-foreground">${totalDeposits.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-display font-bold text-foreground">${totalSpent.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-display font-bold text-foreground">{transactions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-display">Transaction History</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-secondary/30 border-border/30 w-full sm:w-64"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchTransactions} className="border-border/30">
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
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground/70">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Method</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
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
                            <span className="font-medium text-foreground capitalize">{tx.type.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`font-mono font-medium ${
                            tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'referral_commission'
                              ? 'text-success' 
                              : 'text-destructive'
                          }`}>
                            {tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'referral_commission' ? '+' : '-'}
                            ${Number(tx.amount).toFixed(2)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;