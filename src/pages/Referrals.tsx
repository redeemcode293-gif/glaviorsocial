import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Gift,
  DollarSign,
  Copy,
  Share2,
  TrendingUp,
  Percent,
  Twitter,
  Facebook,
  LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocalization } from "@/contexts/LocalizationContext";

interface ReferralStat {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface ReferralEntry {
  id: string;
  user: string;
  orders: number;
  earnings: number;
  status: string;
  joined: string;
}

const Referrals = () => {
  const [referralLink, setReferralLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [referralStats, setReferralStats] = useState<ReferralStat[]>([]);
  const [referralHistory, setReferralHistory] = useState<ReferralEntry[]>([]);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { t, formatPrice } = useLocalization();

  const origin = useMemo(() => window.location.origin.replace(/\/$/, ""), []);

  useEffect(() => {
    if (user) {
      void fetchReferralData();
      return;
    }

    setLoading(false);
    setReferralStats([]);
    setReferralHistory([]);
    setReferralLink("");
  }, [user, profile?.referral_code]);

  const fetchReferralData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (myProfile?.referral_code) {
        setReferralLink(`${origin}/ref/${myProfile.referral_code}`);
      }

      const { data: referrals, error: referralError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (referralError) throw referralError;

      const referredIds = (referrals || []).map((item) => item.referred_id);
      const { data: referredProfiles } = referredIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, email, full_name")
            .in("user_id", referredIds)
        : { data: [] as Array<{ user_id: string; email: string | null; full_name: string | null }> };

      const profileMap = new Map((referredProfiles || []).map((entry) => [entry.user_id, entry]));

      const totalReferrals = referrals?.length || 0;
      const activeReferrals = referrals?.filter((r) => r.status === "active").length || 0;
      const totalEarnings = referrals?.reduce((sum, r) => sum + Number(r.total_earnings || 0), 0) || 0;
      const commissionRate = Number(referrals?.[0]?.commission_rate || 10);

      setReferralStats([
        { label: t("Total Referrals"), value: totalReferrals.toString(), icon: Users, color: "text-primary" },
        { label: t("Active Referrals"), value: activeReferrals.toString(), icon: TrendingUp, color: "text-accent" },
        { label: t("Total Earnings"), value: formatPrice(totalEarnings), icon: DollarSign, color: "text-success" },
        { label: t("Commission Rate"), value: `${commissionRate}%`, icon: Percent, color: "text-warning" },
      ]);

      const history: ReferralEntry[] = (referrals || []).map((ref) => {
        const referredProfile = profileMap.get(ref.referred_id);
        const displayName = referredProfile?.full_name || referredProfile?.email || `${ref.referred_id.slice(0, 8)}***`;

        return {
          id: ref.id,
          user: displayName,
          orders: 0,
          earnings: Number(ref.total_earnings || 0),
          status: ref.status || "inactive",
          joined: new Date(ref.created_at).toLocaleDateString(),
        };
      });

      setReferralHistory(history);
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast({
        title: t("Error"),
        description: t("Failed to load referral data."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!referralLink) return;

    await navigator.clipboard.writeText(referralLink);
    toast({
      title: t("Link Copied!"),
      description: t("Referral link copied to clipboard."),
    });
  };

  const handleShare = (platform: "twitter" | "facebook") => {
    if (!referralLink) return;

    const shareText = t(`Join me on SMM Daddy and get premium SMM services! Use my referral link: ${referralLink}`);
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    };

    window.open(shareUrls[platform], "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <DashboardLayout title={t("Refer & Earn")} subtitle={t("Invite friends and earn commissions")}>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-60 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("Refer & Earn")} subtitle={t("Invite friends and earn commissions")}>
      <div className="space-y-6 animate-fade-in">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 overflow-hidden relative">
          <div className="absolute inset-0 bg-hero-glow opacity-50" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1 text-center lg:text-left">
                <Badge className="mb-3" variant="outline">
                  <Gift className="h-3 w-3 mr-1" />
                  {t("Referral Program")}
                </Badge>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  {t("Earn")} <span className="text-gradient-cyan">{t("10% Commission")}</span> {t("on Every Order")}
                </h2>
                <p className="text-muted-foreground max-w-lg">
                  {t("Share your unique referral link and earn 10% of every order your referrals place. Commissions are automatically credited to your wallet.")}
                </p>
              </div>
              <div className="w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={referralLink || t("Generating your referral link...")}
                    readOnly
                    className="bg-secondary/30 border-border/50 font-mono text-sm min-w-[280px]"
                  />
                  <Button onClick={handleCopy} className="shrink-0" disabled={!user || !referralLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t("Copy Link")}
                  </Button>
                </div>
                <div className="flex justify-center lg:justify-start gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleShare("twitter")} className="border-border/50" disabled={!referralLink}>
                    <Twitter className="h-4 w-4 mr-1" />
                    Tweet
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare("facebook")} className="border-border/50" disabled={!referralLink}>
                    <Facebook className="h-4 w-4 mr-1" />
                    {t("Share")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {referralStats.map((stat, index) => (
            <Card
              key={stat.label}
              className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-border/50 transition-all duration-300 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">{t("How It Works")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Share2, title: t("1. Share Your Link"), text: t("Share your unique referral link with friends and followers") },
                { icon: Users, title: t("2. Friends Sign Up"), text: t("When they register using your link, they're linked to you") },
                { icon: DollarSign, title: t("3. Earn Commissions"), text: t("Get 10% of every order they place, credited automatically") },
              ].map((item, index) => (
                <div key={index} className="text-center p-4 hover:bg-secondary/10 rounded-lg transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">{t("Your Referrals")}</CardTitle>
            <CardDescription>{t("Track your referral activity and earnings")}</CardDescription>
          </CardHeader>
          <CardContent>
            {referralHistory.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">{t("No referrals yet")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("User")}</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Joined")}</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Orders")}</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Earnings")}</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">{t("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralHistory.map((item) => (
                      <tr key={item.id} className="border-b border-border/20">
                        <td className="p-3">{item.user}</td>
                        <td className="p-3">{item.joined}</td>
                        <td className="p-3">{item.orders}</td>
                        <td className="p-3 font-mono">{formatPrice(item.earnings)}</td>
                        <td className="p-3">
                          <Badge variant={item.status === "active" ? "default" : "secondary"}>{t(item.status)}</Badge>
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

export default Referrals;
