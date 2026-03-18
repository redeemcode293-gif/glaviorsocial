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
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalization } from "@/contexts/LocalizationContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PanelService {
  name: string;
  platform: string;
  category: string;
  price: number;
  min_quantity: number;
  max_quantity: number;
  description: string | null;
  refill_supported: boolean | null;
}

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

const formatUsd = (value: number) => `$${value.toFixed(2)}/1K`;

const getPriceRange = (services: PanelService[]) => {
  if (!services.length) return null;
  const prices = services.map((service) => Number(service.price) || 0).sort((a, b) => a - b);
  return {
    min: prices[0],
    max: prices[prices.length - 1],
  };
};

const getTopExamples = (services: PanelService[], limit = 3) => {
  return [...services]
    .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    .slice(0, limit)
    .map((service) => `${service.name} (${formatUsd(Number(service.price) || 0)})`)
    .join(", ");
};

const getMatchingServices = (message: string, services: PanelService[]) => {
  const lower = message.toLowerCase();
  const matchedPlatform = KNOWN_PLATFORMS.find((platform) => {
    if (platform === "X") {
      return /(^|\s)x(\s|$)|twitter/.test(lower);
    }
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

const getStaticResponse = (message: string, services: PanelService[], t: (text: string) => string): string => {
  const lower = message.toLowerCase();
  const { matches, matchedPlatform, matchedCategory } = getMatchingServices(message, services);

  if ((lower.includes("price") || lower.includes("cost") || lower.includes("how much") || lower.includes("cheap")) && services.length > 0) {
    const scopedServices = matches.length > 0 ? matches : services;
    const range = getPriceRange(scopedServices);
    const examples = getTopExamples(scopedServices);
    const scopeLabel = matchedPlatform || matchedCategory || t("our catalog");

    if (range) {
      return t(`Pricing for ${scopeLabel} currently ranges from ${formatUsd(range.min)} to ${formatUsd(range.max)}. Some affordable options are ${examples}. Open the Services page or New Order page to see the full live list before checkout.`);
    }
  }

  if (matches.length > 0 && (matchedPlatform || matchedCategory || lower.includes("service") || lower.includes("recommend"))) {
    const range = getPriceRange(matches);
    const examples = getTopExamples(matches);
    const scopeLabel = matchedPlatform || matchedCategory || t("matching services");
    return t(`I found ${matches.length} ${scopeLabel} services. Popular picks include ${examples}.${range ? ` Current pricing spans ${formatUsd(range.min)} to ${formatUsd(range.max)}.` : ""} If you want, tell me a platform plus goal like followers, likes, or views and I’ll narrow it down further.`);
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

    return t(`We currently list ${services.length} services across platforms like ${summary || "Instagram, YouTube, TikTok, Telegram, and more"}. Use the Services page search or the New Order search box to filter by platform, category, or service ID.`);
  }

  if (lower.includes("order") || lower.includes("place") || lower.includes("buy") || lower.includes("purchase")) {
    return t("Placing an order is simple: 1) open New Order in your dashboard, 2) search by platform, category, or service ID, 3) choose the service, 4) paste your link and quantity, and 5) confirm the payment. The exact price is shown before you submit.");
  }

  if (lower.includes("deliver") || lower.includes("time") || lower.includes("how long") || lower.includes("speed") || lower.includes("fast")) {
    return t("Delivery speed depends on the specific service. Many orders start within minutes, then continue over several hours or days depending on quantity and service type. For best accuracy, check the service description before ordering.");
  }

  if (lower.includes("refill") || lower.includes("drop") || lower.includes("guarantee")) {
    const refillServices = services.filter((service) => service.refill_supported);
    return t(`${refillServices.length} live services currently show refill support. If a refill-enabled order drops during its coverage window, request a refill from your Orders page and the team can review it for restoration.`);
  }

  if (lower.includes("payment") || lower.includes("pay") || lower.includes("crypto") || lower.includes("upi")) {
    return t("You can fund your wallet first, then place orders from your balance. The platform also supports multiple payment options such as crypto and manual payment flows where available in your dashboard.");
  }

  if (lower.includes("help") || lower.includes("support") || lower.includes("contact")) {
    return t("I can help with catalog search, pricing ranges, ordering steps, refills, and delivery expectations. For account-specific issues, open a Support Ticket from your dashboard so the team can inspect your account directly.");
  }

  if (lower.includes("api") || lower.includes("integrate") || lower.includes("reseller")) {
    return t("Yes, reseller/API access is available. Check the API section of your dashboard for documentation, endpoints, and your personal API key.");
  }

  return t("I can help you search services, compare pricing ranges, explain ordering, or find refill-enabled options. Try asking something like ‘cheapest Instagram followers’ or ‘YouTube views price range’.");
};

export const AIChatbot = () => {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [services, setServices] = useState<PanelService[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      id: "1",
      role: "assistant",
      content: t("Hi! I can search the live service catalog for you, explain pricing ranges, and help you pick the right order. Ask for a platform, category, or budget and I’ll narrow it down."),
      timestamp: new Date(),
    }]);
  }, [t]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data: panelData } = await supabase
        .from("panel_services")
        .select("name, platform, category, price, min_quantity, max_quantity, description, refill_supported")
        .eq("is_visible", true);

      if (panelData && panelData.length > 0) {
        setServices(panelData);
        return;
      }

      const { data: servicesData } = await supabase
        .from("services")
        .select("name, platform, category, base_price, min_quantity, max_quantity, description, refill_supported")
        .eq("is_active", true);

      if (servicesData) {
        setServices(servicesData.map((service) => ({
          ...service,
          price: service.base_price,
        })));
      }
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

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getStaticResponse(messageText, services, t),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 500 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
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
        <Card className={`fixed bottom-6 right-6 z-50 w-[380px] shadow-2xl border-primary/20 bg-card/95 backdrop-blur-sm ${isMinimized ? 'h-16' : 'h-[600px]'} transition-all duration-300`}>
          <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-medium">{t("AI Chatbot")}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {t("Live catalog helper")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[420px]">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    <div className={`max-w-[80%] rounded-lg p-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/30 border border-border/30"}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
