import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Zap,
  RefreshCw,
  ShoppingCart,
  Loader2,
  Globe,
  Crown,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformBadge, PLATFORMS, getPlatformIcon, getPlatformColor } from "@/components/ui/platform-icons";
import { useLocalization } from "@/contexts/LocalizationContext";

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
}

// Extract refill days from name (e.g., "30 Days Refill" -> 30)
const extractRefillDays = (name: string): number | null => {
  const match = name.match(/(\d+)\s*(?:days?|d)\s*refill/i);
  return match ? parseInt(match[1]) : null;
};

// Determine service tier based on price and name
const getServiceTier = (service: ServiceDisplay): 'budget' | 'standard' | 'premium' | 'monetization' => {
  const name = service.name.toLowerCase();
  if (name.includes('monetization') || name.includes('monetizable')) return 'monetization';
  if (name.includes('premium') || name.includes('authority') || name.includes('high quality')) return 'premium';
  if (name.includes('starter') || name.includes('cheap') || name.includes('budget')) return 'budget';
  return 'standard';
};

const tierOrder = { budget: 0, standard: 1, premium: 2, monetization: 3 };

// Generate random 3-digit service ID
const generateServiceId = (): number => {
  return Math.floor(Math.random() * 900) + 100; // 100-999
};

const Services = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<ServiceDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceMultiplier, setPriceMultiplier] = useState(1.40); // Default fallback
  const navigate = useNavigate();
  const { t, formatPrice } = useLocalization();

  useEffect(() => {
    fetchServices();
    fetchRegionalMultiplier();
  }, []);

  const fetchRegionalMultiplier = async () => {
    const DEFAULT_FALLBACK = 1.40;
    try {
      // Detect country via edge function
      const { data: countryData } = await supabase.functions.invoke('detect-country');
      const countryCode = countryData?.countryCode;
      
      if (!countryCode || countryCode === 'XX') {
        setPriceMultiplier(DEFAULT_FALLBACK);
        return;
      }

      // Fetch regional pricing
      const { data: regions } = await supabase.from('regional_pricing').select('*');
      if (regions) {
        for (const region of regions) {
          if (region.countries?.includes(countryCode)) {
            setPriceMultiplier(Number(region.multiplier));
            return;
          }
        }
      }
      setPriceMultiplier(DEFAULT_FALLBACK);
    } catch (e) {
      setPriceMultiplier(DEFAULT_FALLBACK);
    }
  };

  const fetchServices = async () => {
    try {
      const { data: panelData, error: panelError } = await supabase
        .from('panel_services')
        .select('*')
        .eq('is_visible', true)
        .order('platform')
        .order('price', { ascending: true });

      if (!panelError && panelData && panelData.length > 0) {
        // Generate random 3-digit service IDs for display
        setServices(panelData.map(s => ({
          ...s,
          service_id: generateServiceId()
        })));
        setLoading(false);
        return;
      }

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported')
        .eq('is_active', true)
        .order('platform')
        .order('base_price', { ascending: true });

      if (servicesError) throw servicesError;
      
      if (servicesData) {
        setServices(servicesData.map(s => ({
          id: s.id,
          service_id: generateServiceId(), // Random 3-digit ID
          name: s.name,
          description: s.description,
          platform: s.platform,
          category: s.category,
          price: s.base_price,
          min_quantity: s.min_quantity,
          max_quantity: s.max_quantity,
          refill_supported: s.refill_supported,
          dripfeed_supported: s.dripfeed_supported,
        })));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort services
  const filteredServices = services
    .filter((service) => {
      const matchesPlatform = selectedPlatform === "all" || service.platform === selectedPlatform;
      const matchesSearch = 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.service_id.toString().includes(searchQuery);
      return matchesPlatform && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by tier first (budget -> standard -> premium -> monetization)
      const tierA = tierOrder[getServiceTier(a)];
      const tierB = tierOrder[getServiceTier(b)];
      if (tierA !== tierB) return tierA - tierB;
      // Then by price within same tier
      return a.price - b.price;
    });

  const availablePlatforms = [...new Set(services.map(s => s.platform))];
  const displayPlatforms = PLATFORMS.filter(p => 
    p.id === "all" || availablePlatforms.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="glow" className="mb-4">{t("SERVICES CATALOG")}</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">{t("Premium")}</span>
              <span className="text-gradient-cyan"> {t("Growth Services")}</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("Discover our comprehensive range of social media growth solutions")}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Search */}
            <div className="relative max-w-lg mx-auto w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search by name, ID, category...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>

            {/* Platform Filters with icons */}
            <div className="flex flex-wrap justify-center gap-2">
              {displayPlatforms.map((platform) => {
                const Icon = platform.icon;
                const isActive = selectedPlatform === platform.id;
                return (
                  <Button
                    key={platform.id}
                    variant={isActive ? "default" : "glass"}
                    size="sm"
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`flex items-center gap-2 ${isActive ? 'glow-cyan' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      platform.id !== 'all' ? `bg-gradient-to-br ${getPlatformColor(platform.id)}` : ''
                    }`}>
                      <Icon className={`h-3 w-3 ${platform.id !== 'all' ? 'text-white' : ''}`} />
                    </div>
                    {t(platform.name)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">{t("Loading services...")}</span>
            </div>
          ) : (
            <>
              {/* Services Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => {
                                const pricePerK = (Number(service.price) || 0) * priceMultiplier;
                                const refillDays = extractRefillDays(service.name);
                                const tier = getServiceTier(service);
                  const Icon = getPlatformIcon(service.platform);
                  const colorClass = getPlatformColor(service.platform);
                  
                  return (
                    <Card key={service.id} variant="glass" className="group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                      {/* Tier indicator */}
                      {tier === 'monetization' && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold gap-1">
                            <Crown className="h-3 w-3" />
                            {t("Monetization")}
                          </Badge>
                        </div>
                      )}
                      {tier === 'premium' && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {t("Premium")}
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 pr-8">
                              <CardTitle className="text-base line-clamp-2">{t(service.name)}</CardTitle>
                              <p className="text-xs text-muted-foreground">{t(service.platform)} • ID: {service.service_id}</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Description */}
                        {service.description && (
                          <div className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {t(service.description || "")}
                            </p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Zap className="h-3 w-3 text-primary" />
                            <span>{t("Fast delivery")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {service.refill_supported || refillDays ? (
                              <>
                                <RefreshCw className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-400">
                                  {refillDays ? t(`${refillDays} Days Refill`) : t('Drop Protection')}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <div>
                            <p className="text-xs text-muted-foreground">{t("Price")}</p>
                            <p className="text-xl font-bold text-gradient-cyan">
                              {formatPrice(pricePerK)}
                              <span className="text-xs text-muted-foreground font-normal">/1K</span>
                            </p>
                          </div>
                          <Button 
                            variant="hero" 
                            size="sm"
                            onClick={() => navigate('/dashboard/order')}
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            {t("Order")}
                          </Button>
                        </div>
                        
                        <p className="text-[10px] text-muted-foreground">
                          Min: {service.min_quantity.toLocaleString()} • Max: {service.max_quantity.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredServices.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {services.length === 0 
                      ? t("No services available. Please check back later.") 
                      : t("No services found matching your criteria")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
