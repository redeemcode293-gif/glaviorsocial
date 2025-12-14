import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users,
  Gift,
  DollarSign,
  Copy,
  Share2,
  TrendingUp,
  CheckCircle2,
  Clock,
  Percent,
  Twitter,
  Facebook
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const referralStats = [
  { label: "Total Referrals", value: "24", icon: Users, color: "text-primary" },
  { label: "Active Referrals", value: "18", icon: CheckCircle2, color: "text-success" },
  { label: "Total Earnings", value: "$156.80", icon: DollarSign, color: "text-accent" },
  { label: "Commission Rate", value: "10%", icon: Percent, color: "text-warning" },
];

const referralHistory = [
  { id: "REF-001", user: "jo****@gmail.com", orders: 12, earnings: 45.60, status: "active", joined: "2024-01-10" },
  { id: "REF-002", user: "sa****@outlook.com", orders: 8, earnings: 28.40, status: "active", joined: "2024-01-12" },
  { id: "REF-003", user: "mi****@yahoo.com", orders: 5, earnings: 18.20, status: "active", joined: "2024-01-13" },
  { id: "REF-004", user: "al****@gmail.com", orders: 15, earnings: 52.80, status: "active", joined: "2024-01-08" },
  { id: "REF-005", user: "ch****@hotmail.com", orders: 0, earnings: 0, status: "pending", joined: "2024-01-15" },
];

const Referrals = () => {
  const [referralLink] = useState("https://glavior.social/ref/USR123ABC");
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link Copied!",
      description: "Referral link copied to clipboard.",
    });
  };

  const handleShare = (platform: string) => {
    const shareText = `Join me on Glavior Social and get premium SMM services! Use my referral link: ${referralLink}`;
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    };
    
    window.open(shareUrls[platform], '_blank');
  };

  return (
    <DashboardLayout title="Refer & Earn" subtitle="Invite friends and earn commissions">
      <div className="space-y-6 animate-fade-in">
        {/* Referral Banner */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 overflow-hidden relative">
          <div className="absolute inset-0 bg-hero-glow opacity-50" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1 text-center lg:text-left">
                <Badge className="mb-3" variant="outline">
                  <Gift className="h-3 w-3 mr-1" />
                  Referral Program
                </Badge>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  Earn <span className="text-gradient-cyan">10% Commission</span> on Every Order
                </h2>
                <p className="text-muted-foreground max-w-lg">
                  Share your unique referral link and earn 10% of every order your referrals place. 
                  Commissions are automatically credited to your wallet.
                </p>
              </div>
              <div className="w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="bg-secondary/30 border-border/50 font-mono text-sm min-w-[280px]"
                  />
                  <Button onClick={handleCopy} className="shrink-0">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
                <div className="flex justify-center lg:justify-start gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare('twitter')}
                    className="border-border/50"
                  >
                    <Twitter className="h-4 w-4 mr-1" />
                    Tweet
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare('facebook')}
                    className="border-border/50"
                  >
                    <Facebook className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {referralStats.map((stat, index) => (
            <Card 
              key={stat.label}
              className="border-border/30 bg-card/60 backdrop-blur-sm hover:border-border/50 transition-colors"
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

        {/* How It Works */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium text-foreground mb-2">1. Share Your Link</h4>
                <p className="text-sm text-muted-foreground">Share your unique referral link with friends and followers</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h4 className="font-medium text-foreground mb-2">2. Friends Sign Up</h4>
                <p className="text-sm text-muted-foreground">When they register using your link, they're linked to you</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <h4 className="font-medium text-foreground mb-2">3. Earn Commissions</h4>
                <p className="text-sm text-muted-foreground">Get 10% of every order they place, credited automatically</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">Your Referrals</CardTitle>
            <CardDescription>Track your referral activity and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Joined</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Orders</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Earnings</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referralHistory.map((ref) => (
                    <tr key={ref.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-sm text-foreground">{ref.user}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-muted-foreground">{ref.joined}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-foreground">{ref.orders}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm text-success">${ref.earnings.toFixed(2)}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant={ref.status === 'active' ? 'default' : 'secondary'}>
                          {ref.status === 'active' ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Referrals;