import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingCart, 
  Link as LinkIcon, 
  Hash, 
  Zap,
  RefreshCw,
  Clock,
  FileText,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface PanelService {
  id: string;
  service_id: number;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  price: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean;
  dripfeed_supported: boolean;
  auto_refill_supported: boolean;
  provider_service_uuid: string | null;
}

const categories = [
  { id: "all", name: "All Platforms" },
  { id: "Instagram", name: "Instagram" },
  { id: "YouTube", name: "YouTube" },
  { id: "TikTok", name: "TikTok" },
  { id: "Telegram", name: "Telegram" },
  { id: "X", name: "X (Twitter)" },
  { id: "Facebook", name: "Facebook" },
  { id: "Spotify", name: "Spotify" },
  { id: "Discord", name: "Discord" },
];

const NewOrder = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedService, setSelectedService] = useState("");
  const [services, setServices] = useState<PanelService[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dripFeed, setDripFeed] = useState(false);
  const [dripFeedRuns, setDripFeedRuns] = useState("");
  const [dripFeedInterval, setDripFeedInterval] = useState("");
  const [autoRefill, setAutoRefill] = useState(false);
  const [massOrderText, setMassOrderText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceMultiplier, setPriceMultiplier] = useState(1);
  const [loadingServices, setLoadingServices] = useState(true);
  const { toast } = useToast();
  const { user, profile, wallet, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
    fetchRegionalMultiplier();
  }, [profile]);

  const fetchServices = async () => {
    setLoadingServices(true);
    // Fetch from panel_services (user-facing abstraction)
    const { data, error } = await supabase
      .from('panel_services')
      .select('*')
      .eq('is_visible', true)
      .order('platform')
      .order('name');

    if (data) {
      setServices(data);
    }
    setLoadingServices(false);
  };

  const fetchRegionalMultiplier = async () => {
    if (!profile?.country_code) return;

    const { data: regions } = await supabase
      .from('regional_pricing')
      .select('*');

    if (regions) {
      for (const region of regions) {
        if (region.countries?.includes(profile.country_code)) {
          setPriceMultiplier(Number(region.multiplier));
          break;
        }
      }
    }
  };

  // Filter services by category and search
  const filteredServices = services.filter(s => {
    const matchesCategory = selectedCategory === "all" || s.platform === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.service_id.toString().includes(searchQuery) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const currentService = services.find(s => s.id === selectedService);

  // Calculate price with hidden regional multiplier
  const calculateDisplayPrice = (basePrice: number) => {
    return (Number(basePrice) * priceMultiplier).toFixed(2);
  };

  const calculateTotal = () => {
    if (!currentService || !quantity) return "0.00";
    const qty = parseInt(quantity) || 0;
    const basePrice = Number(currentService.price);
    const adjustedPrice = basePrice * priceMultiplier;
    return ((adjustedPrice * qty) / 1000).toFixed(2);
  };

  const handleSingleOrder = async () => {
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in to place an order.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!selectedService || !link || !quantity) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(quantity) || 0;
    if (currentService && (qty < currentService.min_quantity || qty > currentService.max_quantity)) {
      toast({
        title: "Invalid Quantity",
        description: `Quantity must be between ${currentService.min_quantity} and ${currentService.max_quantity}.`,
        variant: "destructive",
      });
      return;
    }

    const totalPrice = parseFloat(calculateTotal());
    const balance = Number(wallet?.balance || 0);

    if (totalPrice > balance) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${totalPrice.toFixed(2)} but only have $${balance.toFixed(2)}. Please add funds.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the provider service UUID for order routing
      const providerServiceId = currentService?.provider_service_uuid;

      // Create order with panel service reference and routing info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service_id: providerServiceId || currentService?.id, // Use provider service if mapped
          link: link,
          quantity: qty,
          price: totalPrice,
          status: 'pending',
          order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          dripfeed: dripFeed,
          dripfeed_interval: dripFeed ? parseInt(dripFeedInterval) || 60 : null,
          auto_refill: autoRefill,
          applied_multiplier: priceMultiplier,
          user_country_code: profile?.country_code || null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'order',
          amount: -totalPrice,
          status: 'completed',
          description: `Order #${order.order_number}`,
          reference_id: order.id,
        });

      await refreshProfile();

      toast({
        title: "Order Placed Successfully!",
        description: `Order #${order.order_number} has been submitted.`,
      });

      setLink("");
      setQuantity("");
      setSelectedService("");
      setDripFeed(false);
      setAutoRefill(false);

    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMassOrder = async () => {
    if (!massOrderText.trim()) {
      toast({
        title: "No Orders",
        description: "Please enter orders or upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in to place orders.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const lines = massOrderText.trim().split("\n").filter(l => l.trim());
    let successCount = 0;
    let failedCount = 0;

    for (const line of lines) {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length >= 3) {
        const [serviceId, orderLink, orderQuantity] = parts;
        const service = services.find(s => s.service_id.toString() === serviceId);
        
        if (service) {
          const qty = parseInt(orderQuantity);
          const basePrice = Number(service.price);
          const orderPrice = ((basePrice * priceMultiplier * qty) / 1000);

          try {
            await supabase
              .from('orders')
              .insert({
                user_id: user.id,
                service_id: service.provider_service_uuid || service.id,
                link: orderLink,
                quantity: qty,
                price: orderPrice,
                status: 'pending',
                order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                applied_multiplier: priceMultiplier,
                user_country_code: profile?.country_code || null
              });
            successCount++;
          } catch {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      }
    }

    await refreshProfile();

    toast({
      title: "Mass Order Submitted!",
      description: `${successCount} orders placed successfully. ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
    });

    setMassOrderText("");
    setIsSubmitting(false);
  };

  return (
    <DashboardLayout title="New Order" subtitle="Place single or bulk orders">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Balance Display */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-display font-bold text-gradient-cyan">
                ${Number(wallet?.balance || 0).toFixed(2)}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard/funds')}>
              Add Funds
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/30 p-1">
            <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Single Order
            </TabsTrigger>
            <TabsTrigger value="mass" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
              <FileText className="h-4 w-4 mr-2" />
              Mass Order
            </TabsTrigger>
          </TabsList>

          {/* Single Order */}
          <TabsContent value="single" className="mt-6 space-y-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Order Details</CardTitle>
                <CardDescription>Configure your service order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search Services</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-secondary/30 border-border/30">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Selection */}
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="bg-secondary/30 border-border/30">
                      <SelectValue placeholder={loadingServices ? "Loading services..." : "Select a service"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {filteredServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">[{service.service_id}]</span>
                              <span className="truncate max-w-[250px]">{service.name}</span>
                            </span>
                            <span className="text-primary font-mono text-xs">
                              ${calculateDisplayPrice(service.price)}/1K
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Info */}
                {currentService && (
                  <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3 animate-fade-in">
                    <p className="text-sm text-muted-foreground">{currentService.description}</p>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3 text-primary" />
                        Fast Delivery
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Hash className="h-3 w-3" />
                        Min: {currentService.min_quantity} - Max: {currentService.max_quantity?.toLocaleString()}
                      </Badge>
                      {currentService.refill_supported && (
                        <Badge variant="outline" className="gap-1 text-success border-success/30">
                          <RefreshCw className="h-3 w-3" />
                          Drop protection included
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Link Input */}
                <div className="space-y-2">
                  <Label htmlFor="link">Link</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="link"
                      placeholder="https://instagram.com/username"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Enter quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                      min={currentService?.min_quantity || 0}
                      max={currentService?.max_quantity || 0}
                    />
                  </div>
                  {currentService && (
                    <p className="text-xs text-muted-foreground">
                      Min: {currentService.min_quantity?.toLocaleString()} - Max: {currentService.max_quantity?.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Drip-Feed */}
                {currentService?.dripfeed_supported && (
                  <div className="space-y-4 p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Drip-Feed
                        </Label>
                        <p className="text-xs text-muted-foreground">Gradually deliver over time</p>
                      </div>
                      <Switch checked={dripFeed} onCheckedChange={setDripFeed} />
                    </div>

                    {dripFeed && (
                      <div className="grid grid-cols-2 gap-4 pt-2 animate-fade-in">
                        <div className="space-y-2">
                          <Label className="text-xs">Number of Runs</Label>
                          <Input
                            type="number"
                            placeholder="10"
                            value={dripFeedRuns}
                            onChange={(e) => setDripFeedRuns(e.target.value)}
                            className="bg-secondary/30 border-border/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Interval (minutes)</Label>
                          <Input
                            type="number"
                            placeholder="60"
                            value={dripFeedInterval}
                            onChange={(e) => setDripFeedInterval(e.target.value)}
                            className="bg-secondary/30 border-border/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-Refill */}
                {currentService?.refill_supported && currentService?.auto_refill_supported && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-success" />
                        Auto-Refill
                      </Label>
                      <p className="text-xs text-muted-foreground">Automatically refill if drops occur</p>
                    </div>
                    <Switch checked={autoRefill} onCheckedChange={setAutoRefill} />
                  </div>
                )}

                {/* Order Summary */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="text-3xl font-display font-bold text-gradient-cyan">
                      ${calculateTotal()}
                    </span>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSingleOrder}
                    disabled={isSubmitting || !selectedService || !link || !quantity}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Place Order
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mass Order */}
          <TabsContent value="mass" className="mt-6 space-y-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Mass Order</CardTitle>
                <CardDescription>
                  Place multiple orders at once. Format: service_id|link|quantity (one per line)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Orders (one per line)</Label>
                  <Textarea
                    placeholder={`Example:\n482|https://instagram.com/user1|1000\n739|https://instagram.com/user2|500`}
                    value={massOrderText}
                    onChange={(e) => setMassOrderText(e.target.value)}
                    rows={10}
                    className="font-mono text-sm bg-secondary/30 border-border/30"
                  />
                </div>

                <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                  <p className="text-sm font-medium mb-2">Format Guide</p>
                  <code className="text-xs text-muted-foreground block">
                    service_id|link|quantity
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use the numeric service ID shown in the services list.
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleMassOrder}
                  disabled={isSubmitting || !massOrderText.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Mass Order
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NewOrder;
