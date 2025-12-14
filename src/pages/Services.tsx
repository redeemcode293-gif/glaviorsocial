import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Send, 
  Music2,
  Search,
  Zap,
  RefreshCw,
  Star,
  ShoppingCart,
  Facebook,
  Twitch,
  MessageCircle,
  Disc,
  Loader2,
  Music,
  MessageSquare,
  Globe,
  Camera,
  Linkedin,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const platforms = [
  { id: "all", name: "All", icon: Star },
  { id: "Instagram", name: "Instagram", icon: Instagram },
  { id: "YouTube", name: "YouTube", icon: Youtube },
  { id: "X", name: "X (Twitter)", icon: Twitter },
  { id: "Telegram", name: "Telegram", icon: Send },
  { id: "TikTok", name: "TikTok", icon: Music2 },
  { id: "Facebook", name: "Facebook", icon: Facebook },
  { id: "Spotify", name: "Spotify", icon: Music },
  { id: "Twitch", name: "Twitch", icon: Twitch },
  { id: "Discord", name: "Discord", icon: MessageCircle },
  { id: "WhatsApp", name: "WhatsApp", icon: MessageSquare },
  { id: "Snapchat", name: "Snapchat", icon: Camera },
  { id: "Threads", name: "Threads", icon: Disc },
  { id: "LinkedIn", name: "LinkedIn", icon: Linkedin },
  { id: "Pinterest", name: "Pinterest", icon: ImageIcon },
  { id: "Other", name: "Others", icon: Globe },
];

const getPlatformIcon = (platform: string) => {
  const icons: Record<string, typeof Instagram> = {
    Instagram: Instagram,
    YouTube: Youtube,
    X: Twitter,
    Telegram: Send,
    TikTok: Music2,
    Facebook: Facebook,
    Spotify: Music,
    Twitch: Twitch,
    Discord: MessageCircle,
    WhatsApp: MessageSquare,
    Snapchat: Camera,
    Threads: Disc,
    LinkedIn: Linkedin,
    Pinterest: ImageIcon,
    Other: Globe,
  };
  return icons[platform] || Star;
};

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

const Services = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<ServiceDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      // First try panel_services (user-facing abstracted services)
      const { data: panelData, error: panelError } = await supabase
        .from('panel_services')
        .select('*')
        .eq('is_visible', true)
        .order('platform')
        .order('name');

      if (!panelError && panelData && panelData.length > 0) {
        setServices(panelData);
        setLoading(false);
        return;
      }

      // Fallback to services table if panel_services is empty
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported')
        .eq('is_active', true)
        .order('platform')
        .order('name');

      if (servicesError) throw servicesError;
      
      // Map services data to display format
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
        })));
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesPlatform = selectedPlatform === "all" || service.platform === selectedPlatform;
    const matchesSearch = 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.service_id.toString().includes(searchQuery);
    return matchesPlatform && matchesSearch;
  });

  // Get available platforms from actual services
  const availablePlatforms = [...new Set(services.map(s => s.platform))];
  const displayPlatforms = platforms.filter(p => 
    p.id === "all" || availablePlatforms.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="glow" className="mb-4">SERVICES CATALOG</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">Premium</span>
              <span className="text-gradient-cyan"> Growth Services</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Glavior Social provides scalable social media solutions through a unified platform
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Search */}
            <div className="relative max-w-lg mx-auto w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>

            {/* Platform Filters */}
            <div className="flex flex-wrap justify-center gap-2">
              {displayPlatforms.map((platform) => (
                <Button
                  key={platform.id}
                  variant={selectedPlatform === platform.id ? "default" : "glass"}
                  size="sm"
                  onClick={() => setSelectedPlatform(platform.id)}
                  className="flex items-center gap-2"
                >
                  <platform.icon className="h-4 w-4" />
                  {platform.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading services...</span>
            </div>
          ) : (
            <>
              {/* Services Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => {
                  const PlatformIcon = getPlatformIcon(service.platform);
                  const pricePerK = Number(service.price) || 0;
                  
                  return (
                    <Card key={service.id} variant="glass" className="group hover:border-primary/30 transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                              <PlatformIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base line-clamp-2">{service.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">{service.platform} • ID: {service.service_id}</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {service.description || 'Premium quality service with fast delivery'}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Zap className="h-3 w-3 text-primary" />
                            <span>Fast delivery</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {service.refill_supported ? (
                              <>
                                <RefreshCw className="h-3 w-3 text-emerald-500" />
                                <span>Drop Protection</span>
                              </>
                            ) : (
                              <span>No Refill</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="text-xl font-bold text-gradient-cyan">
                              ${pricePerK.toFixed(2)}
                              <span className="text-xs text-muted-foreground font-normal">/1K</span>
                            </p>
                          </div>
                          <Button 
                            variant="hero" 
                            size="sm"
                            onClick={() => navigate('/dashboard/order')}
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Order
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
                      ? "No services available. Please check back later." 
                      : "No services found matching your criteria"}
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
