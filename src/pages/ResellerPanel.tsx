import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe,
  Users,
  DollarSign,
  Settings,
  Plus,
  ExternalLink,
  Copy,
  Palette,
  Link2,
  TrendingUp,
  ShoppingCart,
  Crown,
  Sparkles,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResellerPanel = () => {
  const [hasPanel, setHasPanel] = useState(false);
  const [panelData, setPanelData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form states
  const [panelName, setPanelName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [pricingMargin, setPricingMargin] = useState("20");

  useEffect(() => {
    checkPanel();
  }, []);

  const checkPanel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('reseller_panels')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setHasPanel(true);
        setPanelData(data);
      }
    }
    setLoading(false);
  };

  const createPanel = async () => {
    if (!panelName || !subdomain) {
      toast({
        title: "Missing Information",
        description: "Please fill in panel name and subdomain",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('reseller_panels')
        .insert({
          user_id: user.id,
          panel_name: panelName,
          subdomain: subdomain.toLowerCase().replace(/[^a-z0-9]/g, ''),
          custom_domain: customDomain || null,
          pricing_margin: parseFloat(pricingMargin),
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setHasPanel(true);
        setPanelData(data);
        toast({
          title: "Panel Created!",
          description: "Your reseller panel is now active",
        });
      }
    }
    setCreating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Reseller Panel" subtitle="Create and manage your white-label SMM panel">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasPanel) {
    return (
      <DashboardLayout title="Reseller Panel" subtitle="Create your own branded SMM panel">
        <div className="space-y-6 animate-fade-in">
          {/* Hero Section */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-hero-glow opacity-30" />
            <CardContent className="p-8 relative">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 text-center lg:text-left">
                  <Badge variant="gold" className="mb-4">
                    <Crown className="h-3 w-3 mr-1" />
                    PRO Feature
                  </Badge>
                  <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                    Launch Your Own <span className="text-gradient-cyan">SMM Panel</span>
                  </h2>
                  <p className="text-muted-foreground max-w-xl mb-6">
                    Create a fully white-labeled SMM panel with your branding. Set your own prices, 
                    manage your customers, and earn profit on every order. All services are powered by 
                    Glavior Social's infrastructure.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>Custom Branding</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>Set Your Margins</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>Custom Domain</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
                <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Globe className="h-24 w-24 text-primary animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Panel Form */}
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Create Your Panel
              </CardTitle>
              <CardDescription>Fill in the details to launch your reseller panel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="panelName">Panel Name *</Label>
                  <Input
                    id="panelName"
                    placeholder="My SMM Panel"
                    value={panelName}
                    onChange={(e) => setPanelName(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomain *</Label>
                  <div className="flex">
                    <Input
                      id="subdomain"
                      placeholder="mysmmpanel"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      className="bg-secondary/30 border-border/30 rounded-r-none"
                    />
                    <div className="px-4 flex items-center bg-secondary/50 border border-l-0 border-border/30 rounded-r-lg text-sm text-muted-foreground">
                      .glavior.social
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                  <Input
                    id="customDomain"
                    placeholder="panel.yourdomain.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin">Pricing Margin (%)</Label>
                  <Input
                    id="margin"
                    type="number"
                    min="5"
                    max="100"
                    placeholder="20"
                    value={pricingMargin}
                    onChange={(e) => setPricingMargin(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                  <p className="text-xs text-muted-foreground">Your profit percentage on each sale</p>
                </div>
              </div>
              
              <Button 
                onClick={createPanel} 
                disabled={creating}
                className="w-full md:w-auto"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Panel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Panel exists - show dashboard
  return (
    <DashboardLayout title="Reseller Panel" subtitle="Manage your white-label SMM panel">
      <div className="space-y-6 animate-fade-in">
        {/* Panel Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Panel Status</p>
                  <Badge variant={panelData?.is_active ? "success" : "secondary"}>
                    {panelData?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-display font-bold text-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-display font-bold text-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-display font-bold text-foreground">$0.00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Details */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/30">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Panel Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/20">
                    <p className="text-sm text-muted-foreground mb-1">Panel Name</p>
                    <p className="font-medium text-foreground">{panelData?.panel_name}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/20">
                    <p className="text-sm text-muted-foreground mb-1">Pricing Margin</p>
                    <p className="font-medium text-foreground">{panelData?.pricing_margin}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/20">
                    <p className="text-sm text-muted-foreground mb-1">Panel URL</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-primary">{panelData?.subdomain}.glavior.social</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(`https://${panelData?.subdomain}.glavior.social`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {panelData?.custom_domain && (
                    <div className="p-4 rounded-lg bg-secondary/20">
                      <p className="text-sm text-muted-foreground mb-1">Custom Domain</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm text-primary">{panelData?.custom_domain}</p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(`https://${panelData?.custom_domain}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Panel
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Panel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Panel Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Panel Name</Label>
                    <Input defaultValue={panelData?.panel_name} className="bg-secondary/30 border-border/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pricing Margin (%)</Label>
                    <Input type="number" defaultValue={panelData?.pricing_margin} className="bg-secondary/30 border-border/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Domain</Label>
                    <Input defaultValue={panelData?.custom_domain || ''} placeholder="panel.yourdomain.com" className="bg-secondary/30 border-border/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input defaultValue={panelData?.logo_url || ''} placeholder="https://..." className="bg-secondary/30 border-border/30" />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Available Services</CardTitle>
                <CardDescription>All Glavior Social services are automatically available on your panel</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Services are synced automatically from Glavior Social. Your pricing margin will be applied on top of base prices.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ResellerPanel;