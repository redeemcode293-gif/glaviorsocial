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
  Search,
  Wallet,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRegionalPricing } from "@/hooks/useRegionalPricing";

interface ServiceDisplay {
  id: string;
  service_id: number;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  price: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean | null;
  dripfeed_supported: boolean | null;
  auto_refill_supported?: boolean | null;
  provider_service_uuid?: string | null;
}

const ALL_PLATFORMS = [
  "Instagram", "YouTube", "TikTok", "Telegram", "X", "Facebook",
  "Spotify", "Discord", "Twitch", "Snapchat", "WhatsApp", "Threads",
  "LinkedIn", "Pinterest", "Reddit", "Apple", "Other"
];

const NewOrder = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedService, setSelectedService] = useState("");
  const [services, setServices] = useState<ServiceDisplay[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dripFeed, setDripFeed] = useState(false);
  const [dripFeedRuns, setDripFeedRuns] = useState("");
  const [dripFeedInterval, setDripFeedInterval] = useState("");
  const [autoRefill, setAutoRefill] = useState(false);
  const [massOrderText, setMassOrderText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const { toast } = useToast();
  const { user, profile, wallet, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t, formatPrice } = useLocalization();
  
  // Use shared regional pricing hook
  const { multiplier: priceMultiplier, loading: loadingPricing, countryCode } = useRegionalPricing();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoadingServices(true);
    
    // First try panel_services (user-facing abstracted services)
    const { data: panelData, error: panelError } = await supabase
      .from('panel_services')
      .select('*')
      .eq('is_visible', true)
      .order('platform')
      .order('name');

    if (!panelError && panelData && panelData.length > 0) {
      setServices(panelData);
      setLoadingServices(false);
      return;
    }

    // Fallback to services table if panel_services is empty
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported')
      .eq('is_active', true)
      .order('platform')
      .order('name');

    if (servicesData) {
      setServices(servicesData.map(s => ({
        id: s.id,
        service_id: s.service_id,
        name: s.name,
        description: s.description,
        platform: s.platform,
        category: s.category,
        price: s.base_price,
        min_quantity: s.min_quantity,
        max_quantity: s.max_quantity,
        refill_supported: s.refill_supported,
        dripfeed_supported: s.dripfeed_supported,
        auto_refill_supported: false,
        provider_service_uuid: null,
      })));
    }
    setLoadingServices(false);
  };

  // Show loading state until both services AND pricing are loaded
  const isLoading = loadingServices || loadingPricing;

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
    return Number(basePrice) * priceMultiplier;
  };

  const calculateTotal = () => {
    if (!currentService || !quantity) return 0;
    const qty = parseInt(quantity) || 0;
    const basePrice = Number(currentService.price);
    const adjustedPrice = basePrice * priceMultiplier;
    return (adjustedPrice * qty) / 1000;
  };

  const handleSingleOrder = async () => {
    if (!user) {
      toast({
        title: t("Not Authenticated"),
        description: t("Please sign in to place an order."),
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!selectedService || !link || !quantity) {
      toast({
        title: t("Missing Information"),
        description: t("Please fill all required fields."),
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(quantity) || 0;
    if (currentService && (qty < currentService.min_quantity || qty > currentService.max_quantity)) {
      toast({
        title: t("Invalid Quantity"),
        description: t(`Quantity must be between ${currentService.min_quantity} and ${currentService.max_quantity}.`),
        variant: "destructive",
      });
      return;
    }

    const totalPrice = calculateTotal();
    const balance = Number(wallet?.balance || 0);

    if (totalPrice > balance) {
      toast({
        title: t("Insufficient Balance"),
        description: t(`You need ${formatPrice(totalPrice)} but only have ${formatPrice(balance)}. Please add funds.`),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the provider service UUID for order routing
      const providerServiceId = currentService?.provider_service_uuid || currentService?.id;

      // Create order with panel service reference and routing info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service_id: providerServiceId,
          link: link,
          quantity: qty,
          price: totalPrice,
          status: 'pending',
          order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          dripfeed: dripFeed,
          dripfeed_interval: dripFeed ? parseInt(dripFeedInterval) || 60 : null,
          auto_refill: autoRefill,
          applied_multiplier: priceMultiplier,
          user_country_code: countryCode || profile?.country_code || null
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
        title: t("Order Placed Successfully!"),
        description: t(`Order #${order.order_number} has been submitted.`),
      });

      setLink("");
      setQuantity("");
      setSelectedService("");
      setDripFeed(false);
      setAutoRefill(false);

    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: t("Order Failed"),
        description: error.message || t("Failed to place order. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMassOrder = async () => {
    if (!massOrderText.trim()) {
      toast({
        title: t("No Orders"),
        description: t("Please enter orders or upload a CSV file."),
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: t("Not Authenticated"),
        description: t("Please sign in to place orders."),
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
                user_country_code: countryCode || profile?.country_code || null
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
      title: t("Mass Order Submitted!"),
      description: t(`${successCount} orders placed successfully. ${failedCount > 0 ? `${failedCount} failed.` : ''}`),
    });

    setMassOrderText("");
    setIsSubmitting(false);
  };

  return (
    <DashboardLayout title={t("New Order")} subtitle={t("Place single or bulk orders")}>
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Left Column - Order Form */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/30 p-1 h-11">
              <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium h-9">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t("Single Order")}
              </TabsTrigger>
              <TabsTrigger value="mass" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium h-9">
                <FileText className="h-4 w-4 mr-2" />
                {t("Mass Order")}
              </TabsTrigger>
            </TabsList>

            {/* Single Order */}
            <TabsContent value="single" className="mt-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-display">{t("Select Service")}</CardTitle>
                  <CardDescription>{t("Search by name, ID, or platform")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Search & Filter Row */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("Search by name or ID...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-secondary/30 border-border/30 h-10"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-secondary/30 border-border/30 h-10">
                        <SelectValue placeholder={t("All Platforms")} />
                      </SelectTrigger>
                      <SelectContent>
                        {[{ id: "all", name: "All Platforms" }, ...ALL_PLATFORMS.map(p => ({ id: p, name: p }))].map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{t(cat.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                {/* Service Selection */}
                <div className="space-y-2">
                  <Label>{t("Service")}</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="bg-secondary/30 border-border/30">
                      <SelectValue placeholder={isLoading ? t("Loading...") : t("Select a service")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {filteredServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">[{service.service_id}]</span>
                              <span className="truncate max-w-[250px]">{t(service.name)}</span>
                            </span>
                            <span className="text-primary font-mono text-xs">
                              {formatPrice(calculateDisplayPrice(service.price))}/1K
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
                    <p className="text-sm text-muted-foreground">{t(currentService.description || "")}</p>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3 text-primary" />
                        {t("Fast Delivery")}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Hash className="h-3 w-3" />
                        {t("Min")}: {currentService.min_quantity} - {t("Max")}: {currentService.max_quantity?.toLocaleString()}
                      </Badge>
                      {currentService.refill_supported && (
                        <Badge variant="outline" className="gap-1 text-success border-success/30">
                          <RefreshCw className="h-3 w-3" />
                          {t("Drop protection included")}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Link Input */}
                <div className="space-y-2">
                  <Label htmlFor="link">{t("Link")}</Label>
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
                  <Label htmlFor="quantity">{t("Quantity")}</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="quantity"
                      type="number"
                      placeholder={t("Enter quantity")}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                      min={currentService?.min_quantity || 0}
                      max={currentService?.max_quantity || 0}
                    />
                  </div>
                  {currentService && (
                    <p className="text-xs text-muted-foreground">
                      {t("Min")}: {currentService.min_quantity.toLocaleString()} | {t("Max")}: {currentService.max_quantity.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Drip Feed Toggle */}
                {currentService?.dripfeed_supported && (
                  <div className="space-y-4 p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("Drip-Feed")}</Label>
                        <p className="text-xs text-muted-foreground">{t("Gradually deliver over time")}</p>
                      </div>
                      <Switch checked={dripFeed} onCheckedChange={setDripFeed} />
                    </div>
                    {dripFeed && (
                      <div className="grid sm:grid-cols-2 gap-3 animate-fade-in">
                        <div className="space-y-2">
                          <Label>{t("Runs")}</Label>
                          <Input
                            type="number"
                            placeholder="10"
                            value={dripFeedRuns}
                            onChange={(e) => setDripFeedRuns(e.target.value)}
                            className="bg-secondary/30 border-border/30"
                            min="2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("Interval (minutes)")}</Label>
                          <Input
                            type="number"
                            placeholder="60"
                            value={dripFeedInterval}
                            onChange={(e) => setDripFeedInterval(e.target.value)}
                            className="bg-secondary/30 border-border/30"
                            min="1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto Refill Toggle */}
                {currentService?.refill_supported && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-success" />
                        {t("Auto-Refill")}
                      </Label>
                      <p className="text-xs text-muted-foreground">{t("Automatically refill drops")}</p>
                    </div>
                    <Switch checked={autoRefill} onCheckedChange={setAutoRefill} />
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  className="w-full h-12 text-base"
                  onClick={handleSingleOrder}
                  disabled={isSubmitting || !selectedService || !link || !quantity}
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      {t("Processing...")}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {t("Place Order")} - {formatPrice(calculateTotal())}
                    </>
                  )}
                </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mass Order */}
            <TabsContent value="mass" className="mt-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-display">{t("Mass Order")}</CardTitle>
                  <CardDescription>{t("Place multiple orders at once")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("Orders")}</Label>
                    <Textarea
                      placeholder={t("service_id|link|quantity\nExample:\n123|https://instagram.com/user1|1000\n456|https://instagram.com/user2|500")}
                      value={massOrderText}
                      onChange={(e) => setMassOrderText(e.target.value)}
                      className="min-h-[200px] bg-secondary/30 border-border/30 font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("Format: service_id|link|quantity (one order per line)")}
                  </p>
                  <Button 
                    className="w-full"
                    onClick={handleMassOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        {t("Processing...")}
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        {t("Submit Mass Order")}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Wallet Balance */}
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("AVAILABLE BALANCE")}</p>
                <p className="text-4xl font-display font-bold text-gradient-cyan">
                  {formatPrice(Number(wallet?.balance || 0))}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4 border-border/50"
                  onClick={() => navigate('/dashboard/add-funds')}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {t("Add Funds")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          {currentService && (
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm animate-fade-in">
              <CardHeader className="pb-3">
                <p className="text-xs text-muted-foreground">ID: {currentService.service_id}</p>
                <CardTitle className="text-base">{t(currentService.name)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("Min")}</p>
                    <p className="font-medium text-foreground">{currentService.min_quantity.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/20 text-center">
                    <p className="text-xs text-muted-foreground">{t("Max")}</p>
                    <p className="font-medium text-foreground">{currentService.max_quantity.toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t("Price per 1K")}</p>
                  <p className="text-3xl font-display font-bold text-primary">
                    {formatPrice(calculateDisplayPrice(currentService.price))}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Services Count */}
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("Available Services")}</span>
              <Badge variant="secondary" className="font-mono">
                {filteredServices.length}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewOrder;