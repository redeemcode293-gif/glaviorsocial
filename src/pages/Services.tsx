import { useState } from "react";
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
  ShoppingCart
} from "lucide-react";

const platforms = [
  { id: "all", name: "All Platforms", icon: Star },
  { id: "instagram", name: "Instagram", icon: Instagram },
  { id: "youtube", name: "YouTube", icon: Youtube },
  { id: "twitter", name: "X (Twitter)", icon: Twitter },
  { id: "telegram", name: "Telegram", icon: Send },
  { id: "tiktok", name: "TikTok", icon: Music2 },
];

const services = [
  {
    id: 1,
    platform: "instagram",
    name: "Instagram Followers",
    description: "High-quality followers with profile pictures and posts",
    basePrice: 1.50,
    regionalPrice: 3.75,
    min: 100,
    max: 50000,
    speed: "1-5K/day",
    refill: true,
    quality: "Premium",
    popular: true,
  },
  {
    id: 2,
    platform: "instagram",
    name: "Instagram Likes",
    description: "Real-looking likes from active accounts",
    basePrice: 0.80,
    regionalPrice: 2.00,
    min: 50,
    max: 100000,
    speed: "5-10K/day",
    refill: false,
    quality: "Standard",
    popular: false,
  },
  {
    id: 3,
    platform: "instagram",
    name: "Instagram Views (Reels)",
    description: "Views for Instagram Reels content",
    basePrice: 0.20,
    regionalPrice: 0.50,
    min: 100,
    max: 1000000,
    speed: "50K/day",
    refill: false,
    quality: "Standard",
    popular: true,
  },
  {
    id: 4,
    platform: "youtube",
    name: "YouTube Views",
    description: "Real YouTube views with high retention",
    basePrice: 2.00,
    regionalPrice: 5.00,
    min: 500,
    max: 100000,
    speed: "5-10K/day",
    refill: false,
    quality: "Premium",
    popular: true,
  },
  {
    id: 5,
    platform: "youtube",
    name: "YouTube Subscribers",
    description: "Subscribers for your YouTube channel",
    basePrice: 5.00,
    regionalPrice: 12.50,
    min: 100,
    max: 10000,
    speed: "500-1K/day",
    refill: true,
    quality: "Premium",
    popular: false,
  },
  {
    id: 6,
    platform: "telegram",
    name: "Telegram Members",
    description: "Real Telegram members for groups/channels",
    basePrice: 3.00,
    regionalPrice: 7.50,
    min: 100,
    max: 50000,
    speed: "2-5K/day",
    refill: false,
    quality: "Premium",
    popular: true,
  },
  {
    id: 7,
    platform: "twitter",
    name: "X Followers",
    description: "Premium X (Twitter) followers",
    basePrice: 2.50,
    regionalPrice: 6.25,
    min: 100,
    max: 25000,
    speed: "1-3K/day",
    refill: true,
    quality: "Premium",
    popular: false,
  },
  {
    id: 8,
    platform: "tiktok",
    name: "TikTok Followers",
    description: "High-quality TikTok followers",
    basePrice: 1.80,
    regionalPrice: 4.50,
    min: 100,
    max: 50000,
    speed: "2-5K/day",
    refill: true,
    quality: "Premium",
    popular: true,
  },
  {
    id: 9,
    platform: "tiktok",
    name: "TikTok Views",
    description: "Views for your TikTok videos",
    basePrice: 0.15,
    regionalPrice: 0.38,
    min: 100,
    max: 10000000,
    speed: "100K/day",
    refill: false,
    quality: "Standard",
    popular: false,
  },
];

const getPlatformIcon = (platform: string) => {
  const icons: Record<string, typeof Instagram> = {
    instagram: Instagram,
    youtube: Youtube,
    twitter: Twitter,
    telegram: Send,
    tiktok: Music2,
  };
  return icons[platform] || Star;
};

const Services = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = services.filter((service) => {
    const matchesPlatform = selectedPlatform === "all" || service.platform === selectedPlatform;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

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
              Region-optimized pricing applied automatically based on your location
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>

            {/* Platform Filters */}
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
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

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const PlatformIcon = getPlatformIcon(service.platform);
              
              return (
                <Card key={service.id} variant="glass" className="group hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <PlatformIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          <p className="text-xs text-muted-foreground capitalize">{service.platform}</p>
                        </div>
                      </div>
                      {service.popular && (
                        <Badge variant="gold" className="text-[10px]">POPULAR</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="h-3 w-3 text-primary" />
                        <span>{service.speed}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {service.refill ? (
                          <>
                            <RefreshCw className="h-3 w-3 text-emerald-500" />
                            <span>Auto-Refill</span>
                          </>
                        ) : (
                          <span>No Refill</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Your Regional Price</p>
                        <p className="text-xl font-bold text-gradient-cyan">
                          ${service.regionalPrice.toFixed(2)}
                          <span className="text-xs text-muted-foreground font-normal">/1K</span>
                        </p>
                      </div>
                      <Button variant="hero" size="sm">
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Order
                      </Button>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground">
                      Min: {service.min.toLocaleString()} • Max: {service.max.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No services found matching your criteria</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
