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
  Calculator,
  Zap,
  RefreshCw,
  Clock,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const categories = [
  { id: "instagram", name: "Instagram" },
  { id: "youtube", name: "YouTube" },
  { id: "tiktok", name: "TikTok" },
  { id: "telegram", name: "Telegram" },
  { id: "twitter", name: "X (Twitter)" },
];

const NewOrder = () => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [services, setServices] = useState<any[]>([]);
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
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('service_id', { ascending: true });

    if (data) {
      setServices(data);
    }
    setLoadingServices(false);
  };

  const fetchRegionalMultiplier = async () => {
    if (!profile?.country_code) return;

    // Get the regional pricing for this user's country (done silently)
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

  const filteredServices = services.filter(s => !selectedCategory || s.platform?.toLowerCase() === selectedCategory);
  const currentService = services.find(s => s.id === selectedService);

  // Calculate price with hidden regional multiplier
  const calculateDisplayPrice = (basePrice: number) => {
    return (Number(basePrice) * priceMultiplier).toFixed(2);
  };

  const calculateTotal = () => {
    if (!currentService || !quantity) return "0.00";
    const qty = parseInt(quantity) || 0;
    const basePrice = Number(currentService.base_price);
    // Apply hidden regional multiplier
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
      // Create order - order_number is auto-generated by database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service_id: selectedService,
          link: link,
          quantity: qty,
          price: totalPrice,
          status: 'pending',
          order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          dripfeed: dripFeed,
          dripfeed_interval: dripFeed ? parseInt(dripFeedInterval) || 60 : null,
          auto_refill: autoRefill,
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

      // Refresh wallet balance
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
          const basePrice = Number(service.base_price);
          const orderPrice = ((basePrice * priceMultiplier * qty) / 1000);

          try {
            await supabase
              .from('orders')
              .insert({
                user_id: user.id,
                service_id: service.id,
                link: orderLink,
                quantity: qty,
                price: orderPrice,
                status: 'pending',
                order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
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
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-secondary/30 border-border/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
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
                    <SelectContent>
                      {filteredServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{service.name}</span>
                            <span className="text-primary font-mono text-xs">
                              ${calculateDisplayPrice(service.base_price)}/1K
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
                    <div className="flex flex-wrap gap-3">
                      {currentService.speed_estimate && (
                        <Badge variant="outline" className="gap-1">
                          <Zap className="h-3 w-3 text-primary" />
                          {currentService.speed_estimate}
                        </Badge>
                      )}
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
                {currentService?.refill_supported && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-success" />
                        Managed Refill
                      </Label>
                      <p className="text-xs text-muted-foreground">Automatic drop protection for 30 days</p>
                    </div>
                    <Switch checked={autoRefill} onCheckedChange={setAutoRefill} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold">Order Summary</h3>
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="text-foreground">{currentService?.name || "Not selected"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="text-foreground">{quantity || "0"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price per 1K</span>
                    <span className="text-foreground">
                      ${currentService ? calculateDisplayPrice(currentService.base_price) : "0.00"}
                    </span>
                  </div>
                  <div className="border-t border-border/30 my-3" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-display font-bold text-gradient-cyan">
                      ${calculateTotal()}
                    </span>
                  </div>
                </div>
                <Button 
                  className="w-full mt-6 h-12 text-base font-semibold" 
                  onClick={handleSingleOrder}
                  disabled={isSubmitting || !currentService || !link || !quantity}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mass Order */}
          <TabsContent value="mass" className="mt-6 space-y-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Mass Order</CardTitle>
                <CardDescription>Submit multiple orders at once</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                  <h4 className="font-semibold mb-2 text-sm">Format Instructions</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter one order per line in the format:
                  </p>
                  <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                    service_id | link | quantity
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Example: <span className="text-foreground">1 | https://instagram.com/user | 1000</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="massOrder">Orders</Label>
                  <Textarea
                    id="massOrder"
                    placeholder="1 | https://instagram.com/user1 | 1000&#10;2 | https://instagram.com/user2 | 500&#10;3 | https://youtube.com/watch?v=xxx | 2000"
                    value={massOrderText}
                    onChange={(e) => setMassOrderText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm bg-secondary/30 border-border/30"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-border/50">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleMassOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Submit Orders
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NewOrder;