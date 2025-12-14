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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickQuestions = [
  "How do I place an order?",
  "What services do you offer?",
  "How long does delivery take?",
  "How do refills work?",
];

const aiResponses: Record<string, string> = {
  "default": "I'm here to help you with any questions about our services. Feel free to ask about ordering, delivery times, or any of our social media growth services!",
  "order": "Placing an order is simple! Go to 'New Order' in your dashboard, select a service, enter the target link and quantity, then confirm. Your order will start processing automatically.",
  "services": "We offer premium growth services for Instagram, YouTube, TikTok, Telegram, X (Twitter), and more. Each service includes fast delivery and quality guarantees. Check our Services page for the full catalog!",
  "delivery": "Delivery times vary by service but are typically very fast. You'll see estimated speeds on each service (e.g., '5K/day'). Most orders start within minutes of placement.",
  "refill": "Services marked with 'Managed Refill' include drop protection. If you experience any drops within the guarantee period, simply request a refill from your Orders page and we'll restore them at no extra cost.",
  "price": "Our pricing is competitive and optimized for your region. You'll see the exact price before confirming any order. We accept crypto, cards, and UPI payments.",
  "help": "I can help you with: placing orders, understanding services, delivery times, refills, payments, and general questions. What would you like to know?",
};

const getAIResponse = (message: string): string => {
  const lower = message.toLowerCase();
  
  if (lower.includes("order") || lower.includes("place") || lower.includes("buy")) {
    return aiResponses["order"];
  }
  if (lower.includes("service") || lower.includes("offer") || lower.includes("what do you")) {
    return aiResponses["services"];
  }
  if (lower.includes("deliver") || lower.includes("time") || lower.includes("how long") || lower.includes("speed")) {
    return aiResponses["delivery"];
  }
  if (lower.includes("refill") || lower.includes("drop") || lower.includes("guarantee")) {
    return aiResponses["refill"];
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("payment") || lower.includes("pay")) {
    return aiResponses["price"];
  }
  if (lower.includes("help") || lower.includes("support")) {
    return aiResponses["help"];
  }
  
  return aiResponses["default"];
};

export const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "👋 Hi! I'm your AI assistant. I can help you with orders, services, and general questions. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(messageText),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg glow-cyan z-50 animate-float"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
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
                Online
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
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce animation-delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce animation-delay-200" />
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
                placeholder="Ask a question..."
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