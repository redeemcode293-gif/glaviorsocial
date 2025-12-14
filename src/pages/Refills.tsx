import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Info,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const refills = [
  { 
    id: "RFL-1234", 
    orderId: "ORD-8934", 
    service: "Instagram Followers - Premium",
    originalQty: 5000,
    refillQty: 480,
    status: "processing",
    requestedAt: "2024-01-15 16:45",
    completedAt: null
  },
  { 
    id: "RFL-1233", 
    orderId: "ORD-8932", 
    service: "TikTok Followers",
    originalQty: 2500,
    refillQty: 120,
    status: "completed",
    requestedAt: "2024-01-14 10:20",
    completedAt: "2024-01-14 14:35"
  },
  { 
    id: "RFL-1232", 
    orderId: "ORD-8928", 
    service: "Instagram Followers - Premium",
    originalQty: 10000,
    refillQty: 850,
    status: "completed",
    requestedAt: "2024-01-13 18:00",
    completedAt: "2024-01-13 22:10"
  },
  { 
    id: "RFL-1231", 
    orderId: "ORD-8920", 
    service: "X Followers - Premium",
    originalQty: 500,
    refillQty: 45,
    status: "pending",
    requestedAt: "2024-01-15 12:30",
    completedAt: null
  },
  { 
    id: "RFL-1230", 
    orderId: "ORD-8915", 
    service: "YouTube Subscribers",
    originalQty: 1000,
    refillQty: 0,
    status: "rejected",
    requestedAt: "2024-01-12 09:15",
    completedAt: "2024-01-12 09:20"
  },
];

const stats = [
  { label: "Active Refills", value: "2", icon: Clock, color: "text-primary" },
  { label: "Completed", value: "12", icon: CheckCircle2, color: "text-success" },
  { label: "Total Refilled", value: "8,450", icon: RefreshCw, color: "text-accent" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
  completed: { label: "Refilled", variant: "default", icon: CheckCircle2 },
  processing: { label: "Processing", variant: "secondary", icon: Clock },
  pending: { label: "Pending", variant: "outline", icon: AlertCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

const Refills = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [requestingRefill, setRequestingRefill] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");
  const { toast } = useToast();

  const filteredRefills = refills.filter(refill => 
    refill.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    refill.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    refill.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRequestRefill = () => {
    if (!newOrderId.trim()) {
      toast({
        title: "Order ID Required",
        description: "Please enter a valid order ID.",
        variant: "destructive",
      });
      return;
    }

    setRequestingRefill(true);
    setTimeout(() => {
      setRequestingRefill(false);
      setNewOrderId("");
      toast({
        title: "Refill Requested",
        description: `Managed refill initiated for order ${newOrderId}.`,
      });
    }, 1500);
  };

  return (
    <DashboardLayout title="Refills" subtitle="Managed refill protection for your orders">
      <div className="space-y-6 animate-fade-in">
        {/* Info Banner */}
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-success mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">Drop Protection Included</h4>
                <p className="text-sm text-muted-foreground">
                  Orders with managed refill are automatically protected. If counts drop within the guarantee period, 
                  request a refill and we'll restore them at no extra cost.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <Card 
              key={stat.label} 
              className="border-border/30 bg-card/60 backdrop-blur-sm"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Request Refill */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">Request Refill</CardTitle>
            <CardDescription>Enter an order ID to request a managed refill</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter Order ID (e.g., ORD-8934)"
                value={newOrderId}
                onChange={(e) => setNewOrderId(e.target.value)}
                className="bg-secondary/30 border-border/30 flex-1"
              />
              <Button onClick={handleRequestRefill} disabled={requestingRefill}>
                {requestingRefill ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Request Refill
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Refill requests are limited to once per order within the guarantee period.
            </p>
          </CardContent>
        </Card>

        {/* Refill History */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-display">Refill History</CardTitle>
              <CardDescription>Track your refill requests</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search refills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border/30"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRefills.map((refill, index) => {
                const status = statusConfig[refill.status];
                const StatusIcon = status.icon;

                return (
                  <div 
                    key={refill.id}
                    className="p-4 rounded-lg bg-secondary/10 border border-border/30 hover:border-border/50 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-primary">{refill.id}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono text-sm text-muted-foreground">{refill.orderId}</span>
                        </div>
                        <p className="font-medium text-foreground">{refill.service}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Original: {refill.originalQty.toLocaleString()}</span>
                          {refill.refillQty > 0 && (
                            <span className="text-success">+{refill.refillQty.toLocaleString()} refilled</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={status.variant} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{refill.requestedAt}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredRefills.length === 0 && (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No refill requests found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Refills;