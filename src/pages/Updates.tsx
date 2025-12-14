import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone,
  Sparkles,
  AlertTriangle,
  Wrench,
  Bell,
  Clock,
  ChevronRight
} from "lucide-react";

const updates = [
  {
    id: 1,
    type: "feature",
    title: "New TikTok Services Available",
    description: "We've added 15+ new TikTok services including followers, likes, views, and comments. All with competitive rates and fast delivery.",
    date: "2024-01-15",
    isNew: true
  },
  {
    id: 2,
    type: "maintenance",
    title: "Scheduled Maintenance - Jan 18",
    description: "We'll be performing system upgrades on January 18th from 2:00 AM - 4:00 AM UTC. Some services may experience brief interruptions.",
    date: "2024-01-14",
    isNew: true
  },
  {
    id: 3,
    type: "improvement",
    title: "Faster Order Processing",
    description: "We've optimized our order processing system. Orders are now processed up to 50% faster than before.",
    date: "2024-01-12",
    isNew: false
  },
  {
    id: 4,
    type: "feature",
    title: "API v2 Released",
    description: "Our new API v2 is now available with improved performance, better error handling, and new endpoints. Check the API documentation for details.",
    date: "2024-01-10",
    isNew: false
  },
  {
    id: 5,
    type: "alert",
    title: "Instagram Service Update",
    description: "Due to platform changes, some Instagram services have been updated. Please check service descriptions for the latest information.",
    date: "2024-01-08",
    isNew: false
  },
  {
    id: 6,
    type: "improvement",
    title: "Enhanced Dashboard Analytics",
    description: "New analytics features have been added to your dashboard. Track your spending, order history, and service usage with detailed charts.",
    date: "2024-01-05",
    isNew: false
  },
  {
    id: 7,
    type: "feature",
    title: "Referral Program Launch",
    description: "Earn 10% commission on every order from your referrals! Share your unique link and start earning today.",
    date: "2024-01-01",
    isNew: false
  },
];

const typeConfig: Record<string, { label: string; icon: typeof Sparkles; color: string; bgColor: string }> = {
  feature: { label: "New Feature", icon: Sparkles, color: "text-success", bgColor: "bg-success/10" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "text-warning", bgColor: "bg-warning/10" },
  improvement: { label: "Improvement", icon: Bell, color: "text-primary", bgColor: "bg-primary/10" },
  alert: { label: "Alert", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

const Updates = () => {
  return (
    <DashboardLayout title="Updates" subtitle="Latest announcements and news">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Stay Updated</h2>
                <p className="text-muted-foreground">Latest news, features, and announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Updates List */}
        <div className="space-y-4">
          {updates.map((update, index) => {
            const config = typeConfig[update.type];
            const Icon = config.icon;

            return (
              <Card 
                key={update.id}
                className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-border/50 transition-all duration-300 group cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`${config.color} border-current/30 text-xs`}>
                            {config.label}
                          </Badge>
                          {update.isNew && (
                            <Badge className="bg-success text-success-foreground text-xs animate-pulse">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {update.date}
                        </div>
                      </div>
                      <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                        {update.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {update.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Load More */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Showing all {updates.length} updates
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Updates;