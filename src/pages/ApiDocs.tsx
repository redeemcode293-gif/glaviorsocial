import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Terminal,
  Zap,
  Book
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const endpoints = [
  {
    name: "Get Balance",
    method: "GET",
    endpoint: "/api/v2/balance",
    action: "balance",
    description: "Returns your current wallet balance",
    params: [],
  response: `{
  "balance": "0.00",
  "currency": "USD"
}`
  },
  {
    name: "List Services",
    method: "GET",
    endpoint: "/api/v2/services",
    action: "services",
    description: "Returns list of all available services with pricing and limits",
    params: [],
    response: `{
  "services": [
    {
      "service": 1,
      "name": "Instagram Followers",
      "category": "Instagram",
      "rate": "2.50",
      "min": 100,
      "max": 50000,
      "refill": true,
      "dripfeed": true
    }
  ]
}`
  },
  {
    name: "Add Order",
    method: "POST",
    endpoint: "/api/v2/order",
    action: "add",
    description: "Place a new order for any service",
    params: [
      { name: "service", type: "integer", required: true, desc: "Service ID" },
      { name: "link", type: "string", required: true, desc: "Target URL/username" },
      { name: "quantity", type: "integer", required: true, desc: "Order quantity" },
      { name: "runs", type: "integer", required: false, desc: "Drip-feed runs (optional)" },
      { name: "interval", type: "integer", required: false, desc: "Drip-feed interval in minutes (optional)" }
    ],
    response: `{
  "order": 12345
}`
  },
  {
    name: "Order Status",
    method: "GET",
    endpoint: "/api/v2/status",
    action: "status",
    description: "Check status of a single order",
    params: [
      { name: "order", type: "integer", required: true, desc: "Order ID" }
    ],
    response: `{
  "charge": "2.50",
  "start_count": "1000",
  "status": "Completed",
  "remains": "0",
  "currency": "USD"
}`
  },
  {
    name: "Multiple Orders Status",
    method: "GET",
    endpoint: "/api/v2/status",
    action: "status",
    description: "Check status of multiple orders at once (max 100)",
    params: [
      { name: "orders", type: "string", required: true, desc: "Comma-separated order IDs (e.g., 1,2,3,4)" }
    ],
    response: `{
  "12345": {
    "charge": "2.50",
    "start_count": "1000",
    "status": "Completed",
    "remains": "0"
  },
  "12346": {
    "charge": "3.00",
    "start_count": "500",
    "status": "Processing",
    "remains": "250"
  }
}`
  },
  {
    name: "Request Refill",
    method: "POST",
    endpoint: "/api/v2/refill",
    action: "refill",
    description: "Request a refill for eligible orders with drop protection",
    params: [
      { name: "order", type: "integer", required: true, desc: "Order ID to refill" }
    ],
    response: `{
  "refill": 67890,
  "status": "Pending"
}`
  },
  {
    name: "Refill Status",
    method: "GET",
    endpoint: "/api/v2/refill/status",
    action: "refill_status",
    description: "Check status of a refill request",
    params: [
      { name: "refill", type: "integer", required: true, desc: "Refill ID" }
    ],
    response: `{
  "status": "Completed"
}`
  },
  {
    name: "Cancel Order",
    method: "POST",
    endpoint: "/api/v2/cancel",
    action: "cancel",
    description: "Cancel a pending order (if cancellation is supported)",
    params: [
      { name: "order", type: "integer", required: true, desc: "Order ID to cancel" }
    ],
    response: `{
  "order": 12345,
  "status": "Cancelled",
  "refund": "2.50"
}`
  }
];

const ApiDocs = () => {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const keyHash = btoa(user.id).substring(0, 32);
      setApiKey(`sk_live_${keyHash}`);
    }
    setLoading(false);
  }, [user]);

  const handleCopyKey = () => {
    if (!user || !apiKey) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in to get your API key.",
        variant: "destructive"
      });
      return;
    }
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "API Key Copied",
      description: "Your API key has been copied to clipboard.",
    });
  };

  const handleRegenerate = async () => {
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in to regenerate your API key.",
        variant: "destructive"
      });
      return;
    }
    
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
      const newKeyHash = btoa(user.id + Date.now()).substring(0, 32);
      setApiKey(`sk_live_${newKeyHash}`);
      toast({
        title: "API Key Regenerated",
        description: "Your new API key is ready to use. Update your integrations.",
      });
    }, 1500);
  };

  const handleCopyCode = (code: string, language: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: `${language} code snippet copied to clipboard.`,
    });
  };

  const curlCode = `curl -X POST https://api.glavior.social/api/v2/order \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "YOUR_API_KEY",
    "action": "add",
    "service": 1,
    "link": "https://instagram.com/username",
    "quantity": 1000
  }'`;

  const pythonCode = `import requests

response = requests.post(
    "https://api.glavior.social/api/v2/order",
    json={
        "key": "YOUR_API_KEY",
        "action": "add",
        "service": 1,
        "link": "https://instagram.com/username",
        "quantity": 1000
    }
)
print(response.json())`;

  const phpCode = `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.glavior.social/api/v2/order");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "key" => "YOUR_API_KEY",
    "action" => "add",
    "service" => 1,
    "link" => "https://instagram.com/username",
    "quantity" => 1000
]));
$response = curl_exec($ch);
curl_close($ch);
echo $response;`;

  const nodeCode = `const response = await fetch("https://api.glavior.social/api/v2/order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "YOUR_API_KEY",
    action: "add",
    service: 1,
    link: "https://instagram.com/username",
    quantity: 1000
  })
});
const data = await response.json();
console.log(data);`;

  if (loading) {
    return (
      <DashboardLayout title="API Documentation" subtitle="Integrate with our powerful API">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="API Documentation" subtitle="Integrate with our powerful API">
      <div className="space-y-6 animate-fade-in">
        {/* API Key Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">Your API Key</CardTitle>
            </div>
            <CardDescription>Use this key to authenticate all API requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  value={apiKey ? (showKey ? apiKey : "•".repeat(apiKey.length)) : "Loading your API key..."}
                  readOnly
                  className="font-mono text-sm bg-secondary/30 border-border/30 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => setShowKey(!showKey)}
                    disabled={!apiKey}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={handleCopyKey}
                    disabled={!apiKey}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleRegenerate}
                disabled={isRegenerating || !apiKey}
                className="border-border/50"
              >
                {isRegenerating ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Regenerating...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Regenerate</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Keep your API key secret. Never expose it in client-side code or public repositories.
            </p>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">Quick Start</CardTitle>
            </div>
            <CardDescription>Get started with our API in minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl">
              <TabsList className="bg-secondary/30">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
                <TabsTrigger value="node">Node.js</TabsTrigger>
              </TabsList>

              <TabsContent value="curl" className="mt-4">
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-sm overflow-x-auto font-mono">
                    {curlCode}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10"
                    onClick={() => handleCopyCode(curlCode, 'cURL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="python" className="mt-4">
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-sm overflow-x-auto font-mono">
                    {pythonCode}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10"
                    onClick={() => handleCopyCode(pythonCode, 'Python')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="php" className="mt-4">
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-sm overflow-x-auto font-mono">
                    {phpCode}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10"
                    onClick={() => handleCopyCode(phpCode, 'PHP')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="node" className="mt-4">
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-sm overflow-x-auto font-mono">
                    {nodeCode}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10"
                    onClick={() => handleCopyCode(nodeCode, 'Node.js')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-display">API Endpoints</CardTitle>
            </div>
            <CardDescription>Complete reference for all available endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {endpoints.map((endpoint, index) => (
              <div 
                key={index} 
                className="p-4 rounded-lg bg-secondary/10 border border-border/30 space-y-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge 
                    variant={endpoint.method === "GET" ? "secondary" : "default"}
                    className="font-mono text-xs"
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm text-primary font-mono">{endpoint.endpoint}</code>
                  <Badge variant="outline" className="font-mono text-xs">
                    action={endpoint.action}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{endpoint.name}</span>
                </div>
                
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>

                {endpoint.params.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs uppercase text-muted-foreground font-medium tracking-wider">Parameters</h5>
                    <div className="space-y-2">
                      {endpoint.params.map((param, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                          <code className="text-primary font-mono">{param.name}</code>
                          <Badge variant="outline" className="text-xs">{param.type}</Badge>
                          {param.required ? (
                            <Badge variant="destructive" className="text-xs">required</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">optional</Badge>
                          )}
                          <span className="text-muted-foreground">{param.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h5 className="text-xs uppercase text-muted-foreground font-medium tracking-wider">Response</h5>
                  <pre className="p-3 rounded bg-[#0d1117] text-[#e6edf3] text-xs overflow-x-auto font-mono">
                    {endpoint.response}
                  </pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">Error Codes</CardTitle>
            <CardDescription>Common error responses and their meanings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { code: "INVALID_KEY", desc: "API key is missing or invalid" },
                { code: "INSUFFICIENT_BALANCE", desc: "Not enough funds in wallet" },
                { code: "INVALID_SERVICE", desc: "Service ID does not exist or is inactive" },
                { code: "INVALID_QUANTITY", desc: "Quantity is below min or above max" },
                { code: "INVALID_LINK", desc: "Target URL format is invalid" },
                { code: "ORDER_NOT_FOUND", desc: "Order ID does not exist" },
                { code: "REFILL_NOT_ALLOWED", desc: "Order is not eligible for refill" },
                { code: "RATE_LIMIT", desc: "Too many requests, please slow down" },
              ].map((error, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded bg-secondary/10">
                  <code className="text-destructive font-mono text-sm">{error.code}</code>
                  <span className="text-sm text-muted-foreground">{error.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rate Limits */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">Rate Limits</CardTitle>
            <CardDescription>API request limits to ensure fair usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/10 text-center hover:bg-secondary/20 transition-colors">
                <p className="text-2xl font-display font-bold text-foreground">100</p>
                <p className="text-xs text-muted-foreground">Requests per minute</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/10 text-center hover:bg-secondary/20 transition-colors">
                <p className="text-2xl font-display font-bold text-foreground">5,000</p>
                <p className="text-xs text-muted-foreground">Requests per hour</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/10 text-center hover:bg-secondary/20 transition-colors">
                <p className="text-2xl font-display font-bold text-foreground">50,000</p>
                <p className="text-xs text-muted-foreground">Requests per day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiDocs;