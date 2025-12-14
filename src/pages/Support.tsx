import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
  Book,
  Headphones
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const tickets = [
  { 
    id: "TKT-1234", 
    subject: "Order not processing", 
    status: "open", 
    priority: "high",
    lastReply: "2024-01-15 14:30",
    created: "2024-01-15 12:00"
  },
  { 
    id: "TKT-1233", 
    subject: "Refund request for cancelled order", 
    status: "pending", 
    priority: "medium",
    lastReply: "2024-01-14 16:45",
    created: "2024-01-14 10:30"
  },
  { 
    id: "TKT-1232", 
    subject: "API integration help", 
    status: "resolved", 
    priority: "low",
    lastReply: "2024-01-13 11:20",
    created: "2024-01-12 09:00"
  },
  { 
    id: "TKT-1231", 
    subject: "Payment not credited", 
    status: "resolved", 
    priority: "high",
    lastReply: "2024-01-12 18:00",
    created: "2024-01-12 14:00"
  },
];

const faqs = [
  { q: "How long does order delivery take?", a: "Delivery time varies by service. Check the estimated speed shown on each service." },
  { q: "What happens if my order is not completed?", a: "If an order cannot be completed, you will receive an automatic refund to your wallet." },
  { q: "How do refills work?", a: "Services with refill support automatically restore any drops within the guarantee period." },
  { q: "Can I cancel an order?", a: "Orders can only be cancelled if they haven't started processing yet." },
  { q: "How do I add funds?", a: "Go to Add Funds page and choose from crypto, card, or UPI payment methods." },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof CheckCircle2 }> = {
  open: { label: "Open", variant: "default", icon: MessageSquare },
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  resolved: { label: "Resolved", variant: "outline", icon: CheckCircle2 },
};

const Support = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("");
  const [orderId, setOrderId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim() || !priority) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Ticket Created",
        description: "Your support ticket has been submitted. We'll respond within 24 hours.",
      });
      setSubject("");
      setMessage("");
      setPriority("");
      setOrderId("");
    }, 1500);
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Support" subtitle="Get help with your account">
      <div className="space-y-6 animate-fade-in">
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/30 max-w-md">
            <TabsTrigger value="tickets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="new" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Send className="h-4 w-4 mr-2" />
              New Ticket
            </TabsTrigger>
            <TabsTrigger value="faq" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Book className="h-4 w-4 mr-2" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* My Tickets */}
          <TabsContent value="tickets" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">My Tickets</CardTitle>
                <CardDescription>View and manage your support tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tickets.map((ticket) => {
                    const status = statusConfig[ticket.status];
                    const StatusIcon = status.icon;

                    return (
                      <div 
                        key={ticket.id}
                        className="p-4 rounded-lg bg-secondary/10 border border-border/30 hover:border-border/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm text-primary">{ticket.id}</span>
                              <Badge variant={status.variant} className="flex items-center gap-1 text-xs">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                              {ticket.priority === "high" && (
                                <Badge variant="destructive" className="text-xs">High Priority</Badge>
                              )}
                            </div>
                            <p className="font-medium text-foreground mb-1">{ticket.subject}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Created: {ticket.created}</span>
                              <span>Last reply: {ticket.lastReply}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    );
                  })}

                  {tickets.length === 0 && (
                    <div className="text-center py-8">
                      <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No tickets yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Ticket */}
          <TabsContent value="new" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm max-w-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-display">Create New Ticket</CardTitle>
                </div>
                <CardDescription>We typically respond within 24 hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="bg-secondary/30 border-border/30">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Related Order ID (optional)</Label>
                    <Input
                      placeholder="e.g., ORD-8934"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    placeholder="Brief description of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-secondary/30 border-border/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[150px] bg-secondary/30 border-border/30"
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Submit Ticket</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm max-w-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-display">Frequently Asked Questions</CardTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-secondary/30 border-border/30"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg bg-secondary/10 border border-border/30"
                    >
                      <h4 className="font-medium text-foreground mb-2 flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {faq.q}
                      </h4>
                      <p className="text-sm text-muted-foreground pl-6">{faq.a}</p>
                    </div>
                  ))}

                  {filteredFaqs.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No matching FAQs found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Support;