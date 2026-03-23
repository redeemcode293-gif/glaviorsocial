import { useEffect, useMemo, useState } from "react";
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
  FileText,
  Search,
  Wallet,
  Loader2,
  CheckCircle2,
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
  "LinkedIn", "Pinterest", "Reddit", "Apple", "Other",
];

const NewOrder = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceDisplay | null>(null);
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
  // We still need the hook for loading state and country code, but we extract the multiplier and ignore it.
const { loading: loadingPricing, countryCode } = useRegionalPricing();
const priceMultiplier = 1; // THE KILLSHOT: Forces the UI and Payload to use exact database prices.

  useEffect(() => {
    void fetchServices();
  }, []);

  useEffect(() => {
    if (services.length === 0) return;
    const stored = sessionStorage.getItem("chatbot_selected_service");
    if (!stored) return;

    try {
      const { id } = JSON.parse(stored) as { id?: string };
      const match = services.find((service) => service.id === id);
      if (match) setSelectedService(match);
    } catch {
      // Ignore invalid session data
    }

    sessionStorage.removeItem("chatbot_selected_service");
  }, [services]);

  const fetchServices = async () => {
    setLoadingServices(true);

    const panelData: ServiceDisplay[] = [];
    let panelPage = 0;

    while (true) {
      const { data, error } = await supabase
        .from("panel_services")
        .select("*")
        .eq("is_visible", true)
        .order("platform")
        .order("name")
        .range(panelPage * 1000, (panelPage + 1) * 1000 - 1);

      if (error) {
        panelPage = -1;
        break;
      }
      if (!data || data.length === 0) break;

      panelData.push(...(data as ServiceDisplay[]));
      if (data.length < 1000) break;
      panelPage += 1;
    }

    if (panelPage !== -1 && panelData.length > 0) {
      setServices(panelData);
      setLoadingServices(false);
      return;
    }

    const servicesData: Array<{
      id: string;
      service_id: number;
      name: string;
      description: string | null;
      platform: string;
      category: string;
      base_price: number;
      min_quantity: number;
      max_quantity: number;
      refill_supported: boolean | null;
      dripfeed_supported: boolean | null;
    }> = [];
    let servicesPage = 0;

    while (true) {
      const { data, error } = await supabase
        .from("services")
        .select("id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported")
        .eq("is_active", true)
        .order("platform")
        .order("name")
        .range(servicesPage * 1000, (servicesPage + 1) * 1000 - 1);

      if (error || !data || data.length === 0) break;

      servicesData.push(...data);
      if (data.length < 1000) break;
      servicesPage += 1;
    }

    setServices(
      (servicesData || []).map((service) => ({
        id: service.id,
        service_id: service.service_id,
        name: service.name,
        description: service.description,
        platform: service.platform,
        category: service.category,
        price: Number(service.base_price),
        min_quantity: service.min_quantity,
        max_quantity: service.max_quantity,
        refill_supported: service.refill_supported,
        dripfeed_supported: service.dripfeed_supported,
        auto_refill_supported: false,
        provider_service_uuid: service.id,
      })),
    );
    setLoadingServices(false);
  };

  const isLoading = loadingServices || loadingPricing;

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory = selectedCategory === "all" || service.platform === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        service.name.toLowerCase().includes(q) ||
        service.service_id.toString().includes(q) ||
        (service.description || "").toLowerCase().includes(q) ||
        service.platform.toLowerCase().includes(q) ||
        service.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  const groupedFilteredServices = useMemo(() => {
    if (selectedCategory !== "all") return null;
    const groups: Record<string, ServiceDisplay[]> = {};
    for (const service of filteredServices) {
      if (!groups[service.platform]) groups[service.platform] = [];
      groups[service.platform].push(service);
    }
    return groups;
  }, [filteredServices, selectedCategory]);

  const calculateDisplayPrice = (basePrice: number) => Number(basePrice) * priceMultiplier;

  const calculateTotal = (service = selectedService, qtyValue = quantity) => {
    if (!service || !qtyValue) return 0;
    const qty = parseInt(qtyValue, 10) || 0;
    return (calculateDisplayPrice(Number(service.price)) * qty) / 1000;
  };

  const resetSingleOrderForm = () => {
    setLink("");
    setQuantity("");
    setSelectedService(null);
    setDripFeed(false);
    setDripFeedRuns("");
    setDripFeedInterval("");
    setAutoRefill(false);
  };

  const createOrder = async (service: ServiceDisplay, orderLink: string, qty: number) => {
    const { data, error } = await supabase.functions.invoke("create-order", {
      body: {
        serviceId: service.provider_service_uuid || service.id,
        link: orderLink,
        quantity: qty,
        dripfeed: dripFeed,
        dripfeedRuns: dripFeed ? parseInt(dripFeedRuns || "0", 10) || null : null,
        dripfeedInterval: dripFeed ? parseInt(dripFeedInterval || "0", 10) || null : null,
        autoRefill,
        appliedMultiplier: priceMultiplier,
        userCountryCode: countryCode || profile?.country_code || null,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleSingleOrder = async () => {
    if (!user) {
      toast({ title: t("Not Authenticated"), description: t("Please sign in to place an order."), variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!selectedService || !link || !quantity) {
      toast({ title: t("Missing Information"), description: t("Please fill all required fields."), variant: "destructive" });
      return;
    }

    const qty = parseInt(quantity, 10) || 0;
    if (qty < selectedService.min_quantity || qty > selectedService.max_quantity) {
      toast({ title: t("Invalid Quantity"), description: t(`Quantity must be between ${selectedService.min_quantity} and ${selectedService.max_quantity}.`), variant: "destructive" });
      return;
    }

    const totalPrice = calculateTotal(selectedService, quantity);
    const balance = Number(wallet?.balance || 0);
    if (totalPrice > balance) {
      toast({ title: t("Insufficient Balance"), description: t(`You need ${formatPrice(totalPrice)} but only have ${formatPrice(balance)}. Please add funds.`), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createOrder(selectedService, link, qty);
      await refreshProfile();
      toast({ title: t("Order Placed Successfully!"), description: t(`Order #${result.order?.order_number} has been submitted.`) });
      resetSingleOrderForm();
    } catch (error: unknown) {
      toast({ title: t("Order Failed"), description: error instanceof Error ? error.message : t("Failed to place order. Please try again."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMassOrder = async () => {
    if (!massOrderText.trim()) {
      toast({ title: t("No Orders"), description: t("Please enter orders or upload a CSV file."), variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: t("Not Authenticated"), description: t("Please sign in to place orders."), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const lines = massOrderText.trim().split("\n").filter((line) => line.trim());
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const line of lines) {
        const [serviceId, orderLink, orderQuantity] = line.split("|").map((part) => part.trim());
        const service = services.find((item) => item.service_id.toString() === serviceId);
        const qty = parseInt(orderQuantity || "0", 10);

        if (!service || !orderLink || !qty) {
          failedCount += 1;
          continue;
        }

        try {
          await createOrder(service, orderLink, qty);
          successCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      await refreshProfile();
      toast({ title: t("Mass Order Submitted!"), description: t(`${successCount} orders placed successfully. ${failedCount > 0 ? `${failedCount} failed.` : ""}`) });
      setMassOrderText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title={t("New Order")} subtitle={t("Place single or bulk orders")}>
      <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/30 p-1 h-11">
              <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium h-9"><ShoppingCart className="h-4 w-4 mr-2" />{t("Single Order")}</TabsTrigger>
              <TabsTrigger value="mass" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium h-9"><FileText className="h-4 w-4 mr-2" />{t("Mass Order")}</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-display">{t("Select Service")}</CardTitle>
                  <CardDescription>{t("Search by name, ID, platform, or category")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder={t("Search by name or ID...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/30 border-border/30 h-10" />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-secondary/30 border-border/30 h-10"><SelectValue placeholder={t("All Platforms")} /></SelectTrigger>
                      <SelectContent>
                        {[{ id: "all", name: "All Platforms" }, ...ALL_PLATFORMS.map((platform) => ({ id: platform, name: platform }))].map((category) => (
                          <SelectItem key={category.id} value={category.id}>{t(category.name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border border-border/30 bg-secondary/10 overflow-hidden">
                    <div className="max-h-[380px] overflow-y-auto">
                      {isLoading ? (
                        <div className="p-6 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />{t("Loading services...")}</div>
                      ) : filteredServices.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">{t("No services match your search.")}</div>
                      ) : groupedFilteredServices ? (
                        Object.entries(groupedFilteredServices).map(([platform, platformServices]) => (
                          <div key={platform}>
                            <div className="sticky top-0 z-10 px-4 py-2 bg-secondary/80 backdrop-blur-sm border-b border-border/30 flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs font-semibold">{platform}</Badge>
                              <span className="text-xs text-muted-foreground">{platformServices.length} {t("services")}</span>
                            </div>
                            <div className="divide-y divide-border/10">
                              {platformServices.map((service) => {
                                const selected = selectedService?.id === service.id;
                                return (
                                  <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => setSelectedService(service)}
                                    className={`w-full p-3 text-left transition-all relative ${
                                      selected
                                        ? "bg-success/10 border-l-4 border-l-success pl-3"
                                        : "hover:bg-secondary/20 border-l-4 border-l-transparent"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-mono text-xs text-muted-foreground">#{service.service_id}</span>
                                          {selected && <Badge className="bg-success text-success-foreground text-xs py-0 px-1.5"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{t("Selected")}</Badge>}
                                        </div>
                                        <p className={`font-medium text-sm truncate ${selected ? "text-success" : "text-foreground"}`}>{service.name}</p>
                                        <p className="text-xs text-muted-foreground/70 truncate">{service.category}</p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className={`font-mono text-sm font-semibold ${selected ? "text-success" : "text-primary"}`}>{formatPrice(calculateDisplayPrice(service.price))}/1K</p>
                                        <p className="text-xs text-muted-foreground">{service.min_quantity.toLocaleString()} – {service.max_quantity.toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="divide-y divide-border/10">
                          {filteredServices.map((service) => {
                            const selected = selectedService?.id === service.id;
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => setSelectedService(service)}
                                className={`w-full p-3 text-left transition-all relative ${
                                  selected
                                    ? "bg-success/10 border-l-4 border-l-success"
                                    : "hover:bg-secondary/20 border-l-4 border-l-transparent"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-xs text-muted-foreground">#{service.service_id}</span>
                                      <Badge variant="outline" className="text-xs py-0 px-1.5">{service.platform}</Badge>
                                      {selected && <Badge className="bg-success text-success-foreground text-xs py-0 px-1.5"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{t("Selected")}</Badge>}
                                    </div>
                                    <p className={`font-medium text-sm truncate ${selected ? "text-success" : "text-foreground"}`}>{service.name}</p>
                                    <p className="text-xs text-muted-foreground/70 truncate">{service.category}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className={`font-mono text-sm font-semibold ${selected ? "text-success" : "text-primary"}`}>{formatPrice(calculateDisplayPrice(service.price))}/1K</p>
                                    <p className="text-xs text-muted-foreground">{service.min_quantity.toLocaleString()} – {service.max_quantity.toLocaleString()}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedService && (
                    <div className="p-4 rounded-lg bg-success/5 border border-success/25 space-y-3 animate-fade-in">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <p className="font-semibold text-success text-sm">{selectedService.name}</p>
                          {selectedService.description && (
                            <p className="text-sm text-success/80 leading-relaxed">{selectedService.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge className="bg-success/15 text-success border-success/30 gap-1 border"><Zap className="h-3 w-3" />{t("Fast Delivery")}</Badge>
                        <Badge className="bg-success/15 text-success border-success/30 gap-1 border"><Hash className="h-3 w-3" />{t("Min")}: {selectedService.min_quantity.toLocaleString()} – {t("Max")}: {selectedService.max_quantity.toLocaleString()}</Badge>
                        {selectedService.refill_supported && <Badge className="bg-success/15 text-success border-success/30 gap-1 border"><RefreshCw className="h-3 w-3" />{t("Drop Protection")}</Badge>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="link">{t("Link")}</Label>
                    <div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="link" placeholder="https://instagram.com/username" value={link} onChange={(e) => setLink(e.target.value)} className="pl-10 bg-secondary/30 border-border/30" /></div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">{t("Quantity")}</Label>
                    <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="quantity" type="number" placeholder={t("Enter quantity")} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="pl-10 bg-secondary/30 border-border/30" min={selectedService?.min_quantity || 0} max={selectedService?.max_quantity || 0} /></div>
                    {selectedService && <p className="text-xs text-muted-foreground">{t("Min")}: {selectedService.min_quantity.toLocaleString()} | {t("Max")}: {selectedService.max_quantity.toLocaleString()}</p>}
                  </div>

                  {selectedService?.dripfeed_supported && (
                    <div className="space-y-4 p-4 rounded-lg bg-secondary/10 border border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5"><Label>{t("Drip-Feed")}</Label><p className="text-xs text-muted-foreground">{t("Gradually deliver over time")}</p></div>
                        <Switch checked={dripFeed} onCheckedChange={setDripFeed} />
                      </div>
                      {dripFeed && (
                        <div className="grid sm:grid-cols-2 gap-3 animate-fade-in">
                          <div className="space-y-2"><Label>{t("Runs")}</Label><Input type="number" placeholder="10" value={dripFeedRuns} onChange={(e) => setDripFeedRuns(e.target.value)} className="bg-secondary/30 border-border/30" min="2" /></div>
                          <div className="space-y-2"><Label>{t("Interval (minutes)")}</Label><Input type="number" placeholder="60" value={dripFeedInterval} onChange={(e) => setDripFeedInterval(e.target.value)} className="bg-secondary/30 border-border/30" min="1" /></div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedService?.refill_supported && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                      <div className="space-y-0.5"><Label className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-success" />{t("Auto-Refill")}</Label><p className="text-xs text-muted-foreground">{t("Automatically refill drops")}</p></div>
                      <Switch checked={autoRefill} onCheckedChange={setAutoRefill} />
                    </div>
                  )}

                  <Button onClick={handleSingleOrder} disabled={isSubmitting || !selectedService} className="w-full">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("Placing Order...")}</> : <><ShoppingCart className="h-4 w-4 mr-2" />{t("Place Order")}</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mass" className="mt-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-display">{t("Mass Order")}</CardTitle>
                  <CardDescription>{t("One order per line: service_id|link|quantity")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea value={massOrderText} onChange={(e) => setMassOrderText(e.target.value)} className="min-h-[240px] bg-secondary/30 border-border/30 font-mono text-sm" placeholder="101|https://instagram.com/example|1000" />
                  <Button onClick={handleMassOrder} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("Submitting...")}</> : <><FileText className="h-4 w-4 mr-2" />{t("Submit Mass Order")}</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />{t("Wallet")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold text-primary">{formatPrice(Number(wallet?.balance || 0))}</p>
              <p className="text-sm text-muted-foreground mt-2">{t("Regional pricing is applied automatically based on your account location.")}</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-display">{t("Order Summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("Selected Service")}</span><span className="font-medium text-right max-w-[180px] truncate">{selectedService?.name || t("None")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("Rate")}</span><span className="font-mono">{selectedService ? `${formatPrice(calculateDisplayPrice(selectedService.price))}/1K` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("Quantity")}</span><span className="font-mono">{quantity || "—"}</span></div>
              <div className="flex justify-between border-t border-border/30 pt-3 text-base font-semibold"><span>{t("Total")}</span><span className="font-mono text-primary">{formatPrice(calculateTotal())}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewOrder;
