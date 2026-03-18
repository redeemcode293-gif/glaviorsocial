import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ShoppingCart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRegionalPricing } from "@/hooks/useRegionalPricing";

interface Message {
  id: string;
  role: "user" | "assistant";
  timestamp: Date;
  type: "text" | "service_list";
  content: string;
  services?: PanelService[];
  query?: string;
}

interface PanelService {
  id: string;
  service_id: number;
  name: string;
  platform: string;
  category: string;
  price: number;
  min_quantity: number;
  max_quantity: number;
  description: string | null;
  refill_supported: boolean | null;
}

type BotResponse =
  | { type: "text"; content: string }
  | { type: "service_list"; services: PanelService[]; query: string };

const KNOWN_PLATFORMS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "Telegram",
  "X",
  "Facebook",
  "Spotify",
  "Discord",
  "Twitch",
  "Snapchat",
  "WhatsApp",
  "Threads",
  "LinkedIn",
  "Pinterest",
  "Reddit",
  "Apple",
];

const getQuickQuestions = (t: (text: string) => string) => [
  t("What services do you offer?"),
  t("What are your cheapest services?"),
  t("How do I place an order?"),
  t("How do refills work?"),
];

const getPriceRange = (services: PanelService[]) => {
  if (!services.length) return null;
  const prices = services.map((service) => Number(service.price) || 0).sort((a, b) => a - b);
  return { min: prices[0], max: prices[prices.length - 1] };
};

const getTopExamples = (services: PanelService[], limit = 3) => {
  return [...services]
    .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    .slice(0, limit)
    .map((service) => service.name)
    .join(", ");
};

const getMatchingServices = (message: string, services: PanelService[]) => {
  const lower = message.toLowerCase();
  const matchedPlatform = KNOWN_PLATFORMS.find((platform) => {
    if (platform === "X") return /(^|\s)x(\s|$)|twitter/.test(lower);
    return lower.includes(platform.toLowerCase());
  });

  const categoryKeywords = [
    "followers",
    "likes",
    "views",
    "comments",
    "subscribers",
    "members",
    "shares",
    "watch time",
    "streams",
    "plays",
  ];
  const matchedCategory = categoryKeywords.find((keyword) => lower.includes(keyword));

  let matches = services.filter((service) => {
    const haystack = `${service.name} ${service.platform} ${service.category} ${service.description || ""}`.toLowerCase();
    if (matchedPlatform && service.platform !== matchedPlatform) return false;
    if (matchedCategory && !haystack.includes(matchedCategory)) return false;
    return lower.split(/\s+/).some((term) => term.length > 2 && haystack.includes(term));
  });

  if (matchedPlatform && matches.length === 0) {
    matches = services.filter((service) => service.platform === matchedPlatform);
  }

  if (matchedCategory && matches.length === 0) {
    matches = services.filter((service) => `${service.name} ${service.category}`.toLowerCase().includes(matchedCategory));
  }

  return { matches, matchedPlatform, matchedCategory };
};

const getStaticResponse = (message: string, services: PanelService[], t: (text: string) => string): BotResponse => {
  const lower = message.toLowerCase();
  const { matches, matchedPlatform, matchedCategory } = getMatchingServices(message, services);
  const asksForPrices = lower.includes("price") || lower.includes("cost") || lower.includes("how much") || lower.includes("cheap") || lower.includes("cheapest");
  const namesCatalog = Boolean(matchedPlatform || matchedCategory || lower.includes("service") || lower.includes("recommend"));

  if (matches.length > 0 && (asksForPrices || namesCatalog)) {
    return {
      type: "service_list",
      services: [...matches].sort((a, b) => a.price - b.price).slice(0, 20),
      query: message,
    };
  }

  if (lower.includes("service") || lower.includes("offer") || lower.includes("what do you") || lower.includes("platform")) {
    const platformCounts = services.reduce((acc, service) => {
      acc[service.platform] = (acc[service.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([platform, count]) => `${platform} (${count})`)
      .join(", ");

    return {
      type: "text",
      content: t(`We currently list ${services.length} services across platforms like ${summary || "Instagram, YouTube, TikTok, Telegram, and more"}. Ask me for a platform or a category like followers, members, likes, or views and I can show matching services.`),
    };
  }

  if (lower.includes("order") || lower.includes("place") || lower.includes("buy") || lower.includes("purchase")) {
    return {
      type: "text",
      content: t("Placing an order is simple: 1) open New Order in your dashboard, 2) search by platform, category, or service ID, 3) choose the service, 4) paste your link and quantity, and 5) confirm the payment."),
    };
  }

  if (lower.includes("refill") || lower.includes("drop") || lower.includes("guarantee")) {
    const refillServices = services.filter((service) => service.refill_supported).length;
    return {
      type: "text",
      content: t(`${refillServices} live services currently show refill support. Ask me for a platform and I can show refill-enabled options.`),
    };
  }

  if (lower.includes("help") || lower.includes("support") || lower.includes("contact")) {
    return {
      type: "text",
      content: t("I can help with catalog search, pricing, ordering, and refill-enabled options. For account-specific issues, please open a Support Ticket from your dashboard."),
    };
  }

  return {
    type: "text",
    content: t("Ask me about a platform or service type like ‘Instagram followers price’ or ‘Telegram members cost’ and I’ll show matching services you can buy."),
  };
};

export const AIChatbot = () => {
  const navigate = useNavigate();
  const { t, formatPrice } = useLocalization();
  const { multiplier: priceMultiplier } = useRegionalPricing();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [services, setServices] = useState<PanelService[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        type: "text",
        content: t("Hi! I can search the live service catalog for you and show services you can buy right away. Ask for a platform, category, or price range."),
        timestamp: new Date(),
      },
    ]);
  }, [t]);

  useEffect(() => {
    void fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const panelServices: PanelService[] = [];
      let panelPage = 0;

      while (true) {
        const { data, error } = await supabase
          .from("panel_services")
          .select("id, service_id, name, platform, category, price, min_quantity, max_quantity, description, refill_supported")
          .eq("is_visible", true)
          .order("platform")
          .order("price", { ascending: true })
          .range(panelPage * 1000, (panelPage + 1) * 1000 - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        panelServices.push(...data);
        if (data.length < 1000) break;
        panelPage += 1;
      }

      if (panelServices.length > 0) {
        setServices(panelServices);
        return;
      }

      const fallbackServices: PanelService[] = [];
      let servicesPage = 0;

      while (true) {
        const { data, error } = await supabase
          .from("services")
          .select("id, service_id, name, platform, category, base_price, min_quantity, max_quantity, description, refill_supported")
          .eq("is_active", true)
          .order("platform")
          .order("base_price", { ascending: true })
          .range(servicesPage * 1000, (servicesPage + 1) * 1000 - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        fallbackServices.push(
          ...data.map((service) => ({
            id: service.id,
            service_id: service.service_id,
            name: service.name,
            platform: service.platform,
            category: service.category,
            price: service.base_price,
            min_quantity: service.min_quantity,
            max_quantity: service.max_quantity,
            description: service.description,
            refill_supported: service.refill_supported,
          })),
        );

        if (data.length < 1000) break;
        servicesPage += 1;
      }

      setServices(fallbackServices);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleBuyNow = (service: PanelService) => {
    sessionStorage.setItem("chatbot_selected_service", JSON.stringify({ id: service.id }));
    setIsOpen(false);
    setIsMinimized(false);
    navigate("/dashboard/order");
  };

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      type: "text",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getStaticResponse(messageText, services, t);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        timestamp: new Date(),
        type: response.type,
        content: response.type === "text" ? response.content : t(`Showing matches for "${response.query}"`),
        services: response.type === "service_list" ? response.services : undefined,
        query: response.type === "service_list" ? response.query : undefined,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 500 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg glow-cyan z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className={`fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] shadow-2xl border-primary/20 bg-card backdrop-blur-sm ${isMinimized ? "h-16" : "h-[100dvh] sm:h-[600px]"} transition-all duration-300 rounded-none sm:rounded-xl`}>
          <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-none sm:rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-medium text-foreground">{t("AI Chatbot")}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {t("Live catalog helper")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={() => setIsMinimized(!isMinimized)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: "calc(100% - 130px)" }}>
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    <div className={`max-w-[85%] rounded-lg p-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary border border-border/50"}`}>
                      <p className="text-sm whitespace-pre-wrap text-foreground">{message.content}</p>

                      {message.type === "service_list" && message.services && (
                        <div className="mt-3 space-y-3">
                          {message.services.map((service) => (
                            <div key={service.id} className="rounded-lg border border-border/40 bg-background/80 p-3 space-y-3">
                              <div className="space-y-1">
                                <p className="text-sm font-medium line-clamp-2">{service.name}</p>
                                <p className="text-xs font-mono text-muted-foreground">ID: {service.service_id}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{service.platform}</Badge>
                                <Badge variant="secondary">{service.category}</Badge>
                                {service.refill_supported && <Badge className="bg-emerald-500/15 text-emerald-400">Refill</Badge>}
                              </div>
                              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                <div>
                                  <p className="font-semibold text-primary">{formatPrice(Number(service.price) * priceMultiplier)}/1K</p>
                                  <p>Min {service.min_quantity.toLocaleString()} • Max {service.max_quantity.toLocaleString()}</p>
                                </div>
                                <Button size="sm" onClick={() => handleBuyNow(service)}>
                                  <ShoppingCart className="h-4 w-4 mr-1" />
                                  Buy Now
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-accent" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-secondary/30 border border-border/30 rounded-lg p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-border/30 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {getQuickQuestions(t).map((question) => (
                    <Badge key={question} variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors text-xs" onClick={() => handleSend(question)}>
                      {question}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t("Ask about services, pricing...")}
                    className="bg-secondary/30 border-border/30"
                  />
                  <Button onClick={() => handleSend()} disabled={!input.trim() || isTyping} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
};

export default AIChatbot;
