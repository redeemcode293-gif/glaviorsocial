import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingCart, 
  Link as LinkIcon, 
  Hash, 
  Calculator,
  Zap,
  RefreshCw,
  Clock,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { id: "instagram", name: "Instagram" },
  { id: "youtube", name: "YouTube" },
  { id: "tiktok", name: "TikTok" },
  { id: "telegram", name: "Telegram" },
  { id: "twitter", name: "X (Twitter)" },
];

const services = [
  { id: 1, category: "instagram", name: "Instagram Followers - Premium", price: 2.50, min: 100, max: 50000, speed: "5K/day", refill: true },
  { id: 2, category: "instagram", name: "Instagram Likes - Real", price: 1.20, min: 50, max: 100000, speed: "10K/day", refill: false },
  { id: 3, category: "instagram", name: "Instagram Views - Reels", price: 0.40, min: 100, max: 1000000, speed: "50K/day", refill: false },
  { id: 4, category: "youtube", name: "YouTube Views - High Retention", price: 4.00, min: 500, max: 100000, speed: "10K/day", refill: false },
  { id: 5, category: "youtube", name: "YouTube Subscribers", price: 10.00, min: 100, max: 10000, speed: "1K/day", refill: true },
  { id: 6, category: "tiktok", name: "TikTok Followers", price: 3.50, min: 100, max: 50000, speed: "5K/day", refill: true },
  { id: 7, category: "telegram", name: "Telegram Members", price: 6.00, min: 100, max: 50000, speed: "3K/day", refill: false },
  { id: 8, category: "twitter", name: "X Followers - Premium", price: 5.00, min: 100, max: 25000, speed: "2K/day", refill: true },
];

const NewOrder = () => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dripFeed, setDripFeed] = useState(false);
  const [dripFeedRuns, setDripFeedRuns] = useState("");
  const [dripFeedInterval, setDripFeedInterval] = useState("");
  const [autoRefill, setAutoRefill] = useState(false);
  const [massOrderText, setMassOrderText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const filteredServices = services.filter(s => !selectedCategory || s.category === selectedCategory);
  const currentService = services.find(s => s.id.toString() === selectedService);

  const calculateTotal = () => {
    if (!currentService || !quantity) return 0;
    const qty = parseInt(quantity) || 0;
    return (currentService.price * qty / 1000).toFixed(2);
  };

  const handleSingleOrder = () => {
    if (!selectedService || !link || !quantity) {
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
        title: "Order Placed Successfully!",
        description: `Order #ORD-${Math.floor(Math.random() * 10000)} has been submitted.`,
      });
      setLink("");
      setQuantity("");
      setSelectedService("");
    }, 1500);
  };

  const handleMassOrder = () => {
    if (!massOrderText.trim()) {
      toast({
        title: "No Orders",
        description: "Please enter orders or upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const lines = massOrderText.trim().split("\n").filter(l => l.trim());
      toast({
        title: "Mass Order Submitted!",
        description: `${lines.length} orders have been queued for processing.`,
      });
      setMassOrderText("");
    }, 2000);
  };

  return (
    <DashboardLayout title="New Order" subtitle="Place single or bulk orders">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/30 p-1">
            <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Single Order
            </TabsTrigger>
            <TabsTrigger value="mass" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
              <FileText className="h-4 w-4 mr-2" />
              Mass Order
            </TabsTrigger>
          </TabsList>

          {/* Single Order */}
          <TabsContent value="single" className="mt-6 space-y-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Order Details</CardTitle>
                <CardDescription>Configure your service order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-secondary/30 border-border/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Selection */}
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="bg-secondary/30 border-border/30">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredServices.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{service.name}</span>
                            <span className="text-primary font-mono text-xs">${service.price}/1K</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Info */}
                {currentService && (
                  <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3 animate-fade-in">
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3 text-primary" />
                        {currentService.speed}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Hash className="h-3 w-3" />
                        Min: {currentService.min} - Max: {currentService.max.toLocaleString()}
                      </Badge>
                      {currentService.refill && (
                        <Badge variant="outline" className="gap-1 text-success border-success/30">
                          <RefreshCw className="h-3 w-3" />
                          Drop protection included
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Link Input */}
                <div className="space-y-2">
                  <Label htmlFor="link">Link</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="link"
                      placeholder="https://instagram.com/username"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Enter quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                      min={currentService?.min || 0}
                      max={currentService?.max || 0}
                    />
                  </div>
                  {currentService && (
                    <p className="text-xs text-muted-foreground">
                      Min: {currentService.min.toLocaleString()} - Max: {currentService.max.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Drip-Feed */}
                <div className="space-y-4 p-4 rounded-lg bg-secondary/10 border border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Drip-Feed
                      </Label>
                      <p className="text-xs text-muted-foreground">Gradually deliver over time</p>
                    </div>
                    <Switch checked={dripFeed} onCheckedChange={setDripFeed} />
                  </div>

                  {dripFeed && (
                    <div className="grid grid-cols-2 gap-4 pt-2 animate-fade-in">
                      <div className="space-y-2">
                        <Label className="text-xs">Number of Runs</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={dripFeedRuns}
                          onChange={(e) => setDripFeedRuns(e.target.value)}
                          className="bg-secondary/30 border-border/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Interval (minutes)</Label>
                        <Input
                          type="number"
                          placeholder="60"
                          value={dripFeedInterval}
                          onChange={(e) => setDripFeedInterval(e.target.value)}
                          className="bg-secondary/30 border-border/30"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-Refill */}
                {currentService?.refill && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-success" />
                        Managed Refill
                      </Label>
                      <p className="text-xs text-muted-foreground">Automatic drop protection for 30 days</p>
                    </div>
                    <Switch checked={autoRefill} onCheckedChange={setAutoRefill} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold">Order Summary</h3>
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="text-foreground">{currentService?.name || "Not selected"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="text-foreground">{quantity || "0"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price per 1K</span>
                    <span className="text-foreground">${currentService?.price.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="border-t border-border/30 my-3" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-display font-bold text-gradient-cyan">
                      ${calculateTotal()}
                    </span>
                  </div>
                </div>
                <Button 
                  className="w-full mt-6 h-12 text-base font-semibold" 
                  onClick={handleSingleOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mass Order */}
          <TabsContent value="mass" className="mt-6 space-y-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Mass Order</CardTitle>
                <CardDescription>Submit multiple orders at once</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-secondary/20 border border-border/30">
                  <h4 className="font-semibold mb-2 text-sm">Format Instructions</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter one order per line in the format:
                  </p>
                  <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                    service_id | link | quantity
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Example: <span className="text-foreground">1 | https://instagram.com/user | 1000</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="massOrder">Orders</Label>
                  <Textarea
                    id="massOrder"
                    placeholder="1 | https://instagram.com/user1 | 1000&#10;2 | https://instagram.com/user2 | 500&#10;3 | https://youtube.com/watch?v=xxx | 2000"
                    value={massOrderText}
                    onChange={(e) => setMassOrderText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm bg-secondary/30 border-border/30"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-border/50">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleMassOrder}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Submit Orders
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NewOrder;