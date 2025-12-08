import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Globe, TrendingUp } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute inset-0 cyber-grid opacity-30" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-float animation-delay-500" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 animate-fade-in">
            <Badge variant="glow" className="px-4 py-1.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Trusted by 50,000+ Creators Worldwide
              </span>
            </Badge>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 animate-fade-in animation-delay-100">
            <span className="text-foreground">Global Social</span>
            <br />
            <span className="text-gradient-cyan">Authority</span>
            <span className="text-foreground"> Infrastructure</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in animation-delay-200">
            The world's most powerful SMM platform. Region-optimized pricing, 
            instant delivery, and enterprise-grade reliability for Instagram, 
            YouTube, Telegram, X and more.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in animation-delay-300">
            <Button variant="hero" size="xl" asChild>
              <Link to="/register" className="flex items-center gap-2">
                Start Growing Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <Link to="/services">
                View Services
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-in animation-delay-500">
            <div className="glass-card p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground counter-glow">99.9%</div>
              <div className="text-xs text-muted-foreground">Uptime SLA</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div className="text-2xl font-bold text-foreground">50M+</div>
              <div className="text-xs text-muted-foreground">Orders Delivered</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">180+</div>
              <div className="text-xs text-muted-foreground">Countries</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="text-2xl font-bold text-foreground">24/7</div>
              <div className="text-xs text-muted-foreground">Auto-Delivery</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
