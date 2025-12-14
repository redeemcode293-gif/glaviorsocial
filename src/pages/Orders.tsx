import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Copy,
  Filter,
  Download,
  ShoppingCart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  processing: { label: "Processing", variant: "secondary", icon: Clock },
  pending: { label: "Pending", variant: "outline", icon: AlertCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  partial: { label: "Partial", variant: "secondary", icon: AlertCircle },
};

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          order.link.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = async (orderId: string) => {
    setRefreshing(orderId);
    // Simulate status refresh
    setTimeout(() => {
      setRefreshing(null);
      toast({
        title: "Status Updated",
        description: `Order status has been refreshed.`,
      });
    }, 1000);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied",
      description: "Order ID copied to clipboard.",
    });
  };

  const handleRequestRefill = async (orderId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('refills')
      .insert({
        order_id: orderId,
        user_id: user.id,
        status: 'pending'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to request refill",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Refill Requested",
        description: "Your managed refill request has been submitted.",
      });
    }
  };

  const getProgress = (order: any) => {
    if (!order.start_count) return 0;
    const delivered = (order.quantity - (order.remains || 0));
    return Math.min(100, Math.round((delivered / order.quantity) * 100));
  };

  if (loading) {
    return (
      <DashboardLayout title="Orders" subtitle="Track and manage your orders">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orders" subtitle="Track and manage your orders">
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID or link..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/30 border-border/30"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-secondary/30 border-border/30">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="border-border/50" onClick={fetchOrders}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="text-lg font-display">Order History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders found</p>
                <Button className="mt-4" onClick={() => navigate('/dashboard/order')}>
                  Place Your First Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30 bg-secondary/20">
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Link</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Progress</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Charge</th>
                      <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => {
                      const status = statusConfig[order.status] || statusConfig.pending;
                      const StatusIcon = status.icon;
                      const progress = getProgress(order);
                      
                      return (
                        <tr 
                          key={order.id} 
                          className="border-b border-border/20 hover:bg-secondary/10 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleCopyId(order.order_number)}
                                className="font-mono text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                              >
                                #{order.order_number}
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(order.created_at).toLocaleString()}
                            </p>
                          </td>
                          <td className="p-4">
                            <a 
                              href={order.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 truncate max-w-[200px]"
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{order.link}</span>
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">Qty: {order.quantity.toLocaleString()}</p>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {(order.quantity - (order.remains || 0)).toLocaleString()} / {order.quantity.toLocaleString()}
                                </span>
                                <span className="text-primary font-mono">{progress}%</span>
                              </div>
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant={status.variant}
                              className="flex items-center gap-1 w-fit"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-4 hidden sm:table-cell">
                            <span className="font-mono text-sm text-foreground">${Number(order.price).toFixed(2)}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              {order.status === "completed" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRequestRefill(order.id)}
                                  className="text-xs border-success/30 text-success hover:bg-success/10"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Refill
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRefresh(order.id)}
                                disabled={refreshing === order.id}
                                className="h-8 w-8"
                              >
                                <RefreshCw className={`h-4 w-4 ${refreshing === order.id ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

export default Orders;
