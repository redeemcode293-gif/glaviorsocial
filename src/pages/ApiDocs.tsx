import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code2,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  Terminal,
  Zap,
  Book
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const endpoints = [
  {
    name: "Get Balance",
    method: "GET",
    endpoint: "/api/v2/balance",
    description: "Returns your current wallet balance",
    params: [],
    response: `{
  "balance": "125.50",
  "currency": "USD"
}`
  },
  {
    name: "List Services",
    method: "GET",
    endpoint: "/api/v2/services",
    description: "Returns list of all available services",
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
      "refill": true
    }
  ]
}`
  },
  {
    name: "Add Order",
    method: "POST",
    endpoint: "/api/v2/order",
    description: "Place a new order",
    params: [
      { name: "service", type: "integer", required: true, desc: "Service ID" },
      { name: "link", type: "string", required: true, desc: "Target URL" },
      { name: "quantity", type: "integer", required: true, desc: "Order quantity" }
    ],
    response: `{
  "order": 12345
}`
  },
  {
    name: "Order Status",
    method: "GET",
    endpoint: "/api/v2/status",
    description: "Check order status",
    params: [
      { name: "order", type: "integer", required: true, desc: "Order ID" }
    ],
    response: `{
  "charge": "2.50",
  "start_count": "1000",
  "status": "Completed",
  "remains": "0"
}`
  },
  {
    name: "Multiple Orders Status",
    method: "GET",
    endpoint: "/api/v2/status",
    description: "Check status of multiple orders",
    params: [
      { name: "orders", type: "string", required: true, desc: "Comma-separated order IDs" }
    ],
    response: `{
  "12345": {
    "status": "Completed"
  },
  "12346": {
    "status": "Processing"
  }
}`
  },
];

const ApiDocs = () => {
  const [apiKey, setApiKey] = useState("sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [showKey, setShowKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "API Key Copied",
      description: "Your API key has been copied to clipboard.",
    });
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
      setApiKey("sk_live_" + Math.random().toString(36).substring(2, 34));
      toast({
        title: "API Key Regenerated",
        description: "Your new API key is ready to use.",
      });
    }, 1500);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Code snippet copied to clipboard.",
    });
  };

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
            <CardDescription>Use this key to authenticate API requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  value={showKey ? apiKey : "•".repeat(apiKey.length)}
                  readOnly
                  className="font-mono text-sm bg-secondary/30 border-border/30 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={handleCopyKey}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleRegenerate}
                disabled={isRegenerating}
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
              Keep your API key secret. Never expose it in client-side code.
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
{`curl -X POST https://api.glavior.social/api/v2/order \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "YOUR_API_KEY",
    "service": 1,
    "link": "https://instagram.com/username",
    "quantity": 1000
  }'`}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => handleCopyCode(`curl example`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="python" className="mt-4">
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-sm overflow-x-auto font-mono">
{`import requests

response = requests.post(
    "https://api.glavior.social/api/v2/order",
    json={
        "key": "YOUR_API_KEY",
        "service": 1,
        "link": "https://instagram.com/username",
        "quantity": 1000
    }
)
print(response.json())`}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => handleCopyCode(`python example`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="php" className="mt-4">
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-sm overflow-x-auto font-mono">
{`<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.glavior.social/api/v2/order");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "key" => "YOUR_API_KEY",
    "service" => 1,
    "link" => "https://instagram.com/username",
    "quantity" => 1000
]));
$response = curl_exec($ch);
echo $response;`}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => handleCopyCode(`php example`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="node" className="mt-4">
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-sm overflow-x-auto font-mono">
{`const response = await fetch("https://api.glavior.social/api/v2/order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "YOUR_API_KEY",
    service: 1,
    link: "https://instagram.com/username",
    quantity: 1000
  })
});
const data = await response.json();
console.log(data);`}
                  </pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => handleCopyCode(`node example`)}
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
          </CardHeader>
          <CardContent className="space-y-6">
            {endpoints.map((endpoint, index) => (
              <div 
                key={index} 
                className="p-4 rounded-lg bg-secondary/10 border border-border/30 space-y-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge 
                    variant={endpoint.method === "GET" ? "secondary" : "default"}
                    className="font-mono text-xs"
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm text-primary font-mono">{endpoint.endpoint}</code>
                  <span className="text-sm text-muted-foreground">{endpoint.name}</span>
                </div>
                
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>

                {endpoint.params.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs uppercase text-muted-foreground font-medium tracking-wider">Parameters</h5>
                    <div className="space-y-2">
                      {endpoint.params.map((param, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <code className="text-primary font-mono">{param.name}</code>
                          <Badge variant="outline" className="text-xs">{param.type}</Badge>
                          {param.required && <Badge variant="destructive" className="text-xs">required</Badge>}
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

        {/* Rate Limits */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">Rate Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/10 text-center">
                <p className="text-2xl font-display font-bold text-foreground">100</p>
                <p className="text-xs text-muted-foreground">Requests per minute</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/10 text-center">
                <p className="text-2xl font-display font-bold text-foreground">5,000</p>
                <p className="text-xs text-muted-foreground">Requests per hour</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/10 text-center">
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