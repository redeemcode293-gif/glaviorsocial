import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User,
  Minimize2,
  Sparkles,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Service {
  name: string;
  platform: string;
  category: string;
  base_price: number;
  min_quantity: number;
  max_quantity: number;
  description: string | null;
  refill_supported: boolean | null;
}

const quickQuestions = [
  "What services do you offer?",
  "How do I place an order?",
  "How long does delivery take?",
  "How do refills work?",
];

const getStaticResponse = (message: string, services: Service[]): string => {
  const lower = message.toLowerCase();
  
  // Service-specific queries
  if (lower.includes("instagram")) {
    const igServices = services.filter(s => s.platform === "Instagram");
    if (igServices.length > 0) {
      const types = [...new Set(igServices.map(s => s.category))].slice(0, 5).join(", ");
      const priceRange = igServices.length > 0 
        ? `$${Math.min(...igServices.map(s => s.base_price)).toFixed(2)} - $${Math.max(...igServices.map(s => s.base_price)).toFixed(2)}/1K`
        : "competitive prices";
      return `We have ${igServices.length} Instagram services available including: ${types}. Prices range from ${priceRange}. Would you like to know more about a specific type?`;
    }
    return "We offer various Instagram growth services. Visit our Services page to see the full catalog!";
  }
  
  if (lower.includes("youtube")) {
    const ytServices = services.filter(s => s.platform === "YouTube");
    if (ytServices.length > 0) {
      return `We have ${ytServices.length} YouTube services including views, subscribers, likes, and more. Check our Services page for the full list!`;
    }
    return "We offer YouTube growth services. Check our Services page!";
  }
  
  if (lower.includes("telegram")) {
    const tgServices = services.filter(s => s.platform === "Telegram");
    if (tgServices.length > 0) {
      return `We have ${tgServices.length} Telegram services for groups and channels. Perfect for growing your Telegram community!`;
    }
    return "We offer Telegram member and engagement services.";
  }
  
  if (lower.includes("tiktok")) {
    const ttServices = services.filter(s => s.platform === "TikTok");
    if (ttServices.length > 0) {
      return `We have ${ttServices.length} TikTok services including followers, likes, and views to boost your content!`;
    }
    return "We offer TikTok growth services.";
  }
  
  if (lower.includes("twitter") || lower.includes(" x ") || lower.includes("x/twitter")) {
    const xServices = services.filter(s => s.platform === "X");
    if (xServices.length > 0) {
      return `We have ${xServices.length} X (Twitter) services to grow your presence on the platform!`;
    }
    return "We offer X (Twitter) growth services.";
  }
  
  if (lower.includes("facebook")) {
    const fbServices = services.filter(s => s.platform === "Facebook");
    if (fbServices.length > 0) {
      return `We have ${fbServices.length} Facebook services for pages, posts, and profiles!`;
    }
    return "We offer Facebook growth services.";
  }
  
  if (lower.includes("spotify")) {
    const spServices = services.filter(s => s.platform === "Spotify");
    if (spServices.length > 0) {
      return `We have ${spServices.length} Spotify services to boost your music streams and followers!`;
    }
    return "We offer Spotify growth services for artists.";
  }
  
  if (lower.includes("discord")) {
    const dcServices = services.filter(s => s.platform === "Discord");
    if (dcServices.length > 0) {
      return `We have ${dcServices.length} Discord services to grow your server community!`;
    }
    return "We offer Discord member services.";
  }

  // Price queries
  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
    if (services.length > 0) {
      const cheapest = services.reduce((a, b) => a.base_price < b.base_price ? a : b);
      return `Prices vary by service. Our most affordable options start at $${cheapest.base_price.toFixed(2)}/1K. Pricing is optimized based on your region for the best value. Check the Services page for specific prices!`;
    }
    return "Our pricing is competitive and optimized for your region. You'll see the exact price before confirming any order.";
  }

  // Order process
  if (lower.includes("order") || lower.includes("place") || lower.includes("buy") || lower.includes("purchase")) {
    return "Placing an order is simple! 1) Go to 'New Order' in your dashboard, 2) Select a service from the dropdown, 3) Enter the target link and quantity, 4) Confirm payment. Your order will start processing automatically!";
  }

  // Services overview
  if (lower.includes("service") || lower.includes("offer") || lower.includes("what do you") || lower.includes("platform")) {
    const platformCounts = services.reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const platforms = Object.keys(platformCounts).slice(0, 6).join(", ");
    return `We offer ${services.length} premium growth services across platforms like ${platforms || 'Instagram, YouTube, TikTok, Telegram, and more'}. Visit our Services page for the full catalog!`;
  }

  // Delivery
  if (lower.includes("deliver") || lower.includes("time") || lower.includes("how long") || lower.includes("speed") || lower.includes("fast")) {
    return "Delivery times vary by service. Most orders start within minutes and complete within 24-72 hours. Speed estimates are shown on each service card. High-demand services typically deliver 5K-50K per day!";
  }

  // Refills
  if (lower.includes("refill") || lower.includes("drop") || lower.includes("guarantee")) {
    const refillServices = services.filter(s => s.refill_supported);
    return `${refillServices.length > 0 ? `${refillServices.length} of our services include Managed Refill protection.` : 'Many services include Managed Refill.'} If counts drop within the guarantee period, request a refill from your Orders page and we'll restore them at no extra cost!`;
  }

  // Payment
  if (lower.includes("payment") || lower.includes("pay") || lower.includes("crypto") || lower.includes("upi")) {
    return "We accept multiple payment methods including cryptocurrency (USDT, BTC, SOL), UPI, and manual payments with proof upload. Add funds to your wallet first, then use your balance to place orders!";
  }

  // Help
  if (lower.includes("help") || lower.includes("support") || lower.includes("contact")) {
    return "I can help you with: services, pricing, ordering, delivery times, refills, and payments. For account issues or specific problems, please open a Support Ticket from your dashboard!";
  }

  // API
  if (lower.includes("api") || lower.includes("integrate") || lower.includes("reseller")) {
    return "Yes, we offer API access for resellers and developers! You can integrate our services into your own panel. Check the API section in your dashboard for documentation and your API key.";
  }

  // Default
  return "I'm here to help! You can ask me about our services, pricing, ordering process, delivery times, refills, or payments. What would you like to know?";
};

export const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "👋 Hi! I'm your AI assistant. I can help you find the right services, answer questions about pricing, delivery, and more. What can I help you with?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data } = await supabase
        .from('services')
        .select('name, platform, category, base_price, min_quantity, max_quantity, description, refill_supported')
        .eq('is_active', true);
      
      if (data) {
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Generate response based on services data
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getStaticResponse(messageText, services),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 500 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-12 px-4 rounded-full shadow-lg glow-cyan z-50 flex items-center gap-2"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">AI Chatbot</span>
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 z-50 border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
      isMinimized ? "w-72 h-14" : "w-80 sm:w-96 h-[500px]"
    } flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">AI Assistant</p>
            {!isMinimized && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Online • {services.length} services loaded
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === "assistant" 
                    ? "bg-gradient-to-br from-primary to-accent" 
                    : "bg-secondary"
                }`}>
                  {msg.role === "assistant" ? (
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-lg p-2.5 text-sm ${
                  msg.role === "assistant"
                    ? "bg-secondary/50 text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Bot className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="bg-secondary/50 rounded-lg p-2.5 text-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:100ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:200ms]" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2">
              <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Quick questions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors text-xs"
                    onClick={() => handleSend(q)}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border/30">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about services, pricing..."
                className="flex-1 bg-secondary/30 border-border/30 text-sm h-9"
              />
              <Button 
                size="icon" 
                className="h-9 w-9 shrink-0"
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default AIChatbot;