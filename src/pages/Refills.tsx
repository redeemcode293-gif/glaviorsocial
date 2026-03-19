import { useEffect, useMemo, useState } from "react";
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
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface RefillRow {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  order_number?: string;
  service_name?: string;
  quantity?: number;
}

const Refills = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [requestingRefill, setRequestingRefill] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");
  const [refills, setRefills] = useState<RefillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLocalization();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      void fetchRefills();
      return;
    }

    setRefills([]);
    setLoading(false);
  }, [user]);

  const fetchRefills = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("refills")
      .select("id, order_id, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: t("Error"), description: t("Failed to load refill requests."), variant: "destructive" });
      setLoading(false);
      return;
    }

    const orderIds = (data || []).map((item) => item.order_id);
    const { data: orders } = orderIds.length
      ? await supabase
          .from("orders")
          .select("id, order_number, quantity, service_id")
          .in("id", orderIds)
      : { data: [] as Array<{ id: string; order_number: string; quantity: number; service_id: string }> };

    const serviceIds = (orders || []).map((order) => order.service_id);
    const { data: services } = serviceIds.length
      ? await supabase
          .from("services")
          .select("id, name")
          .in("id", serviceIds)
      : { data: [] as Array<{ id: string; name: string }> };

    const orderMap = new Map((orders || []).map((order) => [order.id, order]));
    const serviceMap = new Map((services || []).map((service) => [service.id, service]));

    setRefills(
      (data || []).map((item) => {
        const order = orderMap.get(item.order_id);
        const service = order ? serviceMap.get(order.service_id) : null;

        return {
          ...item,
          order_number: order?.order_number,
          quantity: order?.quantity,
          service_name: service?.name || t("Service unavailable"),
        };
      }),
    );

    setLoading(false);
  };

  const stats = useMemo(() => {
    const activeCount = refills.filter((refill) => ["pending", "processing"].includes(refill.status)).length;
    const completedCount = refills.filter((refill) => refill.status === "completed").length;
    const totalQuantity = refills.reduce((sum, refill) => sum + Number(refill.quantity || 0), 0);

    return [
      { label: t("Active Refills"), value: activeCount.toString(), icon: Clock, color: "text-primary" },
      { label: t("Completed"), value: completedCount.toString(), icon: CheckCircle2, color: "text-success" },
      { label: t("Total Protected Qty"), value: totalQuantity.toLocaleString(), icon: RefreshCw, color: "text-accent" },
    ];
  }, [refills, t]);

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
    completed: { label: t("Refilled"), variant: "default", icon: CheckCircle2 },
    processing: { label: t("Processing"), variant: "secondary", icon: Clock },
    pending: { label: t("Pending"), variant: "outline", icon: AlertCircle },
    rejected: { label: t("Rejected"), variant: "destructive", icon: XCircle },
  };

  const filteredRefills = refills.filter((refill) => {
    const q = searchQuery.toLowerCase();
    return (
      refill.id.toLowerCase().includes(q) ||
      (refill.order_number || "").toLowerCase().includes(q) ||
      (refill.service_name || "").toLowerCase().includes(q)
    );
  });

  const handleRequestRefill = async () => {
    if (!user) return;

    if (!newOrderId.trim()) {
      toast({ title: t("Order ID Required"), description: t("Please enter a valid order ID."), variant: "destructive" });
      return;
    }

    setRequestingRefill(true);

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, service_id, status")
        .eq("user_id", user.id)
        .or(`order_number.eq.${newOrderId.trim()},id.eq.${newOrderId.trim()}`)
        .maybeSingle();

      if (orderError || !order) {
        throw new Error(t("Order not found."));
      }

      const { data: service } = await supabase
        .from("services")
        .select("refill_supported")
        .eq("id", order.service_id)
        .maybeSingle();

      if (!service?.refill_supported) {
        throw new Error(t("This service does not support refills."));
      }

      const { error } = await supabase.from("refills").insert({
        order_id: order.id,
        user_id: user.id,
        status: "pending",
      });

      if (error) throw error;

      setNewOrderId("");
      await fetchRefills();
      toast({ title: t("Refill Requested"), description: t(`Managed refill initiated for order ${order.order_number}.`) });
    } catch (error: unknown) {
      toast({ title: t("Request Failed"), description: error instanceof Error ? error.message : t("Unable to request refill."), variant: "destructive" });
    } finally {
      setRequestingRefill(false);
    }
  };

  return (
    <DashboardLayout title={t("Refills")} subtitle={t("Managed refill protection for your orders")}>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-success mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">{t("Drop Protection Included")}</h4>
                <p className="text-sm text-muted-foreground">{t("Orders with managed refill are automatically protected.")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-foreground">{loading ? "—" : stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">{t("Request Refill")}</CardTitle>
            <CardDescription>{t("Enter your order number to request a managed refill")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input placeholder={t("Enter Order ID or Number")} value={newOrderId} onChange={(e) => setNewOrderId(e.target.value)} className="bg-secondary/30 border-border/30 flex-1" />
              <Button onClick={handleRequestRefill} disabled={requestingRefill || !user}>
                {requestingRefill ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />{t("Requesting...")}</> : <><RefreshCw className="h-4 w-4 mr-2" />{t("Request Refill")}</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-display">{t("Refill History")}</CardTitle>
              <CardDescription>{t("Track your refill requests")}</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("Search refills...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/30 border-border/30" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRefills.map((refill) => {
                const status = statusConfig[refill.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <div key={refill.id} className="p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-primary">{refill.id}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono text-sm text-muted-foreground">{refill.order_number || refill.order_id}</span>
                        </div>
                        <p className="font-medium text-foreground">{t(refill.service_name || "")}</p>
                        <p className="text-xs text-muted-foreground">{new Date(refill.created_at).toLocaleString()}</p>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {!loading && filteredRefills.length === 0 && (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("No refill requests found")}</p>
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
