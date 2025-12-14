import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Copy,
  MoreHorizontal,
  Filter,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const orders = [
  { 
    id: "ORD-8934", 
    service: "Instagram Followers - Premium", 
    link: "https://instagram.com/johndoe",
    quantity: 5000, 
    startCount: 12500,
    currentCount: 15340,
    status: "processing", 
    charge: 12.50,
    date: "2024-01-15 14:32",
    refillable: true
  },
  { 
    id: "ORD-8933", 
    service: "YouTube Views - High Retention", 
    link: "https://youtube.com/watch?v=abc123",
    quantity: 10000, 
    startCount: 5200,
    currentCount: 15200,
    status: "completed", 
    charge: 40.00,
    date: "2024-01-15 12:15",
    refillable: false
  },
  { 
    id: "ORD-8932", 
    service: "TikTok Followers", 
    link: "https://tiktok.com/@user",
    quantity: 2500, 
    startCount: 8000,
    currentCount: 10500,
    status: "completed", 
    charge: 8.75,
    date: "2024-01-15 10:45",
    refillable: true
  },
  { 
    id: "ORD-8931", 
    service: "Telegram Members", 
    link: "https://t.me/channel",
    quantity: 1000, 
    startCount: 2500,
    currentCount: 2500,
    status: "pending", 
    charge: 6.00,
    date: "2024-01-15 09:20",
    refillable: false
  },
  { 
    id: "ORD-8930", 
    service: "Instagram Likes - Real", 
    link: "https://instagram.com/p/xyz123",
    quantity: 3000, 
    startCount: 150,
    currentCount: 3150,
    status: "completed", 
    charge: 3.60,
    date: "2024-01-14 22:10",
    refillable: false
  },
  { 
    id: "ORD-8929", 
    service: "X Followers - Premium", 
    link: "https://x.com/user",
    quantity: 500, 
    startCount: 1200,
    currentCount: 1200,
    status: "cancelled", 
    charge: 2.50,
    date: "2024-01-14 18:45",
    refillable: true
  },
  { 
    id: "ORD-8928", 
    service: "Instagram Followers - Premium", 
    link: "https://instagram.com/brand",
    quantity: 10000, 
    startCount: 5000,
    currentCount: 12800,
    status: "partial", 
    charge: 25.00,
    date: "2024-01-14 15:30",
    refillable: true
  },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  processing: { label: "Processing", variant: "secondary", icon: Clock },
  pending: { label: "Pending", variant: "outline", icon: AlertCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  partial: { label: "Partial", variant: "secondary", icon: AlertCircle },
};

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          order.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = (orderId: string) => {
    setRefreshing(orderId);
    setTimeout(() => {
      setRefreshing(null);
      toast({
        title: "Status Updated",
        description: `Order ${orderId} status has been refreshed.`,
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

  const handleRequestRefill = (orderId: string) => {
    toast({
      title: "Refill Requested",
      description: `Managed refill initiated for order ${orderId}.`,
    });
  };

  const getProgress = (start: number, current: number, quantity: number) => {
    const delivered = current - start;
    return Math.min(100, Math.round((delivered / quantity) * 100));
  };

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
                  placeholder="Search by order ID or service..."
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
                <Button variant="outline" className="border-border/50">
                  <Download className="h-4 w-4 mr-2" />
                  Export
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Order</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Progress</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Charge</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => {
                    const status = statusConfig[order.status];
                    const StatusIcon = status.icon;
                    const progress = getProgress(order.startCount, order.currentCount, order.quantity);
                    
                    return (
                      <tr 
                        key={order.id} 
                        className="border-b border-border/20 hover:bg-secondary/10 transition-colors"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleCopyId(order.id)}
                              className="font-mono text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                            >
                              #{order.id}
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{order.date}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-sm text-foreground">{order.service}</p>
                          <a 
                            href={order.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 truncate max-w-[200px]"
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{order.link}</span>
                          </a>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{(order.currentCount - order.startCount).toLocaleString()} / {order.quantity.toLocaleString()}</span>
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
                          <span className="font-mono text-sm text-foreground">${order.charge.toFixed(2)}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            {order.refillable && order.status === "completed" && (
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

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Orders;