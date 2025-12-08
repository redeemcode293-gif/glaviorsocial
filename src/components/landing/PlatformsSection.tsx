import { Card, CardContent } from "@/components/ui/card";
import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Send, 
  Music2, 
  Facebook,
  Linkedin,
  MessageCircle
} from "lucide-react";

const platforms = [
  { name: "Instagram", icon: Instagram, color: "from-pink-500 to-purple-600", services: "12+ Services" },
  { name: "YouTube", icon: Youtube, color: "from-red-500 to-red-600", services: "8+ Services" },
  { name: "X (Twitter)", icon: Twitter, color: "from-slate-600 to-slate-800", services: "10+ Services" },
  { name: "Telegram", icon: Send, color: "from-blue-400 to-blue-600", services: "6+ Services" },
  { name: "TikTok", icon: Music2, color: "from-pink-500 to-cyan-400", services: "9+ Services" },
  { name: "Facebook", icon: Facebook, color: "from-blue-500 to-blue-700", services: "7+ Services" },
  { name: "LinkedIn", icon: Linkedin, color: "from-blue-600 to-blue-800", services: "5+ Services" },
  { name: "Discord", icon: MessageCircle, color: "from-indigo-500 to-indigo-700", services: "4+ Services" },
];

export const PlatformsSection = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Every Platform.</span>
            <span className="text-gradient-cyan"> One Hub.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Dominate across all major social platforms with our comprehensive service network
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {platforms.map((platform, index) => (
            <Card 
              key={platform.name} 
              variant="glass" 
              className="group cursor-pointer hover:scale-105 transition-all duration-300 hover:border-primary/50"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <platform.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{platform.name}</h3>
                <p className="text-xs text-muted-foreground">{platform.services}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
