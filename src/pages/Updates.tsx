import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Sparkles, AlertTriangle, Wrench, Bell, Clock, ChevronRight } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  type: string | null;
  title: string;
  content: string;
  created_at: string;
}

const Updates = () => {
  const { t } = useLocalization();
  const [updates, setUpdates] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("id, type, title, content, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error) {
      setUpdates(data || []);
    }

    setLoading(false);
  };

  const typeConfig: Record<string, { label: string; icon: typeof Sparkles; color: string; bgColor: string }> = {
    feature: { label: t("New Feature"), icon: Sparkles, color: "text-success", bgColor: "bg-success/10" },
    maintenance: { label: t("Maintenance"), icon: Wrench, color: "text-warning", bgColor: "bg-warning/10" },
    improvement: { label: t("Improvement"), icon: Bell, color: "text-primary", bgColor: "bg-primary/10" },
    alert: { label: t("Alert"), icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
    info: { label: t("Update"), icon: Bell, color: "text-primary", bgColor: "bg-primary/10" },
    update: { label: t("Update"), icon: Bell, color: "text-primary", bgColor: "bg-primary/10" },
    success: { label: t("Update"), icon: Sparkles, color: "text-success", bgColor: "bg-success/10" },
    warning: { label: t("Maintenance"), icon: Wrench, color: "text-warning", bgColor: "bg-warning/10" },
  };

  return (
    <DashboardLayout title={t("Updates")} subtitle={t("Latest announcements and news")}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">{t("Stay Updated")}</h2>
                <p className="text-muted-foreground">{t("Latest news, features, and announcements")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!loading && updates.length === 0 && (
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-10 text-center text-muted-foreground">
                {t("No announcements available right now.")}
              </CardContent>
            </Card>
          )}

          {updates.map((update, index) => {
            const config = typeConfig[update.type || "info"] || typeConfig.info;
            const Icon = config.icon;
            const isNew = index < 3;

            return (
              <Card key={update.id} className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-border/50 transition-all group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`${config.color} border-current/30 text-xs`}>{config.label}</Badge>
                          {isNew && <Badge className="bg-success text-success-foreground text-xs animate-pulse">{t("NEW")}</Badge>}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(update.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">{update.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{update.content}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {loading ? t("Loading updates...") : `${t("Showing all")} ${updates.length} ${t("updates")}`}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Updates;
