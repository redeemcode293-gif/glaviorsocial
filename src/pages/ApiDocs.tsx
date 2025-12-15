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
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

const ApiDocs = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocalization();

  const endpoints = [
    {
      name: t("Get Balance"),
      method: "GET",
      endpoint: "/api/v2/balance",
      action: "balance",
      description: t("Returns your current wallet balance"),
      params: [],
      response: `{
  "balance": "0.00",
  "currency": "USD"
}`
    },
    {
      name: t("List Services"),
      method: "GET",
      endpoint: "/api/v2/services",
      action: "services",
      description: t("Returns list of all available services with pricing and limits"),
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
      name: t("Add Order"),
      method: "POST",
      endpoint: "/api/v2/order",
      action: "add",
      description: t("Place a new order for any service"),
      params: [
        { name: "service", type: "integer", required: true, desc: t("Service ID") },
        { name: "link", type: "string", required: true, desc: t("Target URL/username") },
        { name: "quantity", type: "integer", required: true, desc: t("Order quantity") },
        { name: "runs", type: "integer", required: false, desc: t("Drip-feed runs (optional)") },
        { name: "interval", type: "integer", required: false, desc: t("Drip-feed interval in minutes (optional)") }
      ],
      response: `{
  "order": 12345
}`
    },
    {
      name: t("Order Status"),
      method: "GET",
      endpoint: "/api/v2/status",
      action: "status",
      description: t("Check status of a single order"),
      params: [
        { name: "order", type: "integer", required: true, desc: t("Order ID") }
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
      name: t("Multiple Orders Status"),
      method: "GET",
      endpoint: "/api/v2/status",
      action: "status",
      description: t("Check status of multiple orders at once (max 100)"),
      params: [
        { name: "orders", type: "string", required: true, desc: t("Comma-separated order IDs") }
      ],
      response: `{
  "12345": {
    "charge": "2.50",
    "start_count": "1000",
    "status": "Completed",
    "remains": "0"
  }
}`
    },
    {
      name: t("Request Refill"),
      method: "POST",
      endpoint: "/api/v2/refill",
      action: "refill",
      description: t("Request a refill for eligible orders with drop protection"),
      params: [
        { name: "order", type: "integer", required: true, desc: t("Order ID to refill") }
      ],
      response: `{
  "refill": 67890,
  "status": "Pending"
}`
    },
    {
      name: t("Cancel Order"),
      method: "POST",
      endpoint: "/api/v2/cancel",
      action: "cancel",
      description: t("Cancel a pending order (if cancellation is supported)"),
      params: [
        { name: "order", type: "integer", required: true, desc: t("Order ID to cancel") }
      ],
      response: `{
  "order": 12345,
  "status": "Cancelled",
  "refund": "2.50"
}`
    }
  ];

  // Fetch the real API key from database
  useEffect(() => {
    const fetchApiKey = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // First try to get existing active key
        const { data: existingKey, error: fetchError } = await supabase
          .from('api_keys')
          .select('api_key, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching API key:', fetchError);
          setIsLoading(false);
          return;
        }

        if (existingKey) {
          setApiKey(existingKey.api_key);
        } else {
          // No active key exists, create one
          const { data: newKey, error: createError } = await supabase
            .from('api_keys')
            .insert({ user_id: user.id })
            .select('api_key')
            .single();

          if (createError) {
            console.error('Error creating API key:', createError);
          } else if (newKey) {
            setApiKey(newKey.api_key);
          }
        }
      } catch (err) {
        console.error('Error in API key fetch:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, [user]);

  const handleCopyKey = () => {
    if (!user || !apiKey) {
      toast({
        title: t("Not Authenticated"),
        description: t("Please sign in to get your API key."),
        variant: "destructive"
      });
      return;
    }
    navigator.clipboard.writeText(apiKey);
    toast({
      title: t("API Key Copied"),
      description: t("Your API key has been copied to clipboard."),
    });
  };

  const handleRegenerate = async () => {
    if (!user) {
      toast({
        title: t("Not Authenticated"),
        description: t("Please sign in to regenerate your API key."),
        variant: "destructive"
      });
      return;
    }
    
    setIsRegenerating(true);
    
    try {
      // Deactivate existing keys
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Create new key (database generates it securely via gen_random_bytes)
      const { data: newKey, error } = await supabase
        .from('api_keys')
        .insert({ user_id: user.id })
        .select('api_key')
        .single();

      if (error) {
        throw error;
      }

      if (newKey) {
        setApiKey(newKey.api_key);
        toast({
          title: t("API Key Regenerated"),
          description: t("Your new API key is ready to use."),
        });
      }
    } catch (err) {
      console.error('Error regenerating API key:', err);
      toast({
        title: t("Error"),
        description: t("Failed to regenerate API key. Please try again."),
        variant: "destructive"
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyCode = (code: string, language: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: t("Copied"),
      description: `${language} ${t("code snippet copied to clipboard.")}`,
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

  if (authLoading || isLoading) {
    return (
      <DashboardLayout title={t("API Documentation")} subtitle={t("Integrate with our powerful API")}>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("API Documentation")} subtitle={t("Integrate with our powerful API")}>
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* API Key Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-base md:text-lg font-display">{t("Your API Key")}</CardTitle>
            </div>
            <CardDescription className="text-xs md:text-sm">{t("Use this key to authenticate all API requests")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  value={apiKey ? (showKey ? apiKey : "•".repeat(Math.min(apiKey.length, 40))) : t("Loading your API key...")}
                  readOnly
                  className="font-mono text-xs md:text-sm bg-secondary/30 border-border/30 pr-20"
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
                disabled={isRegenerating || !user}
                className="border-border/50 w-full sm:w-auto"
              >
                {isRegenerating ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> {t("Regenerating...")}</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> {t("Regenerate")}</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {t("Keep your API key secret. Never expose it in client-side code.")}
            </p>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle className="text-base md:text-lg font-display">{t("Quick Start")}</CardTitle>
            </div>
            <CardDescription className="text-xs md:text-sm">{t("Get started with our API in minutes")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl">
              <TabsList className="bg-secondary/30 w-full overflow-x-auto flex">
                <TabsTrigger value="curl" className="flex-1 sm:flex-none text-xs md:text-sm">cURL</TabsTrigger>
                <TabsTrigger value="python" className="flex-1 sm:flex-none text-xs md:text-sm">Python</TabsTrigger>
                <TabsTrigger value="php" className="flex-1 sm:flex-none text-xs md:text-sm">PHP</TabsTrigger>
                <TabsTrigger value="node" className="flex-1 sm:flex-none text-xs md:text-sm">Node.js</TabsTrigger>
              </TabsList>

              {[
                { value: "curl", code: curlCode, lang: "cURL" },
                { value: "python", code: pythonCode, lang: "Python" },
                { value: "php", code: phpCode, lang: "PHP" },
                { value: "node", code: nodeCode, lang: "Node.js" }
              ].map(({ value, code, lang }) => (
                <TabsContent key={value} value={value} className="mt-4">
                  <div className="relative">
                    <pre className="p-3 md:p-4 rounded-lg bg-[#0d1117] text-[#e6edf3] text-xs md:text-sm overflow-x-auto font-mono">
                      {code}
                    </pre>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10"
                      onClick={() => handleCopyCode(code, lang)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <CardTitle className="text-base md:text-lg font-display">{t("API Endpoints")}</CardTitle>
            </div>
            <CardDescription className="text-xs md:text-sm">{t("Complete reference for all available endpoints")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            {endpoints.map((endpoint, index) => (
              <div 
                key={index} 
                className="p-3 md:p-4 rounded-lg bg-secondary/10 border border-border/30 space-y-3 md:space-y-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <Badge 
                    variant={endpoint.method === "GET" ? "secondary" : "default"}
                    className="font-mono text-xs"
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-xs md:text-sm text-primary font-mono break-all">{endpoint.endpoint}</code>
                  <Badge variant="outline" className="font-mono text-xs hidden sm:inline-flex">
                    action={endpoint.action}
                  </Badge>
                </div>
                
                <p className="text-xs md:text-sm font-medium">{endpoint.name}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{endpoint.description}</p>

                {endpoint.params.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs uppercase text-muted-foreground font-medium tracking-wider">{t("Parameters")}</h5>
                    <div className="space-y-2">
                      {endpoint.params.map((param, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                          <code className="text-primary font-mono">{param.name}</code>
                          <Badge variant="outline" className="text-xs">{param.type}</Badge>
                          {param.required ? (
                            <Badge variant="destructive" className="text-xs">{t("required")}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t("optional")}</Badge>
                          )}
                          <span className="text-muted-foreground w-full sm:w-auto">{param.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h5 className="text-xs uppercase text-muted-foreground font-medium tracking-wider">{t("Response")}</h5>
                  <pre className="p-2 md:p-3 rounded bg-[#0d1117] text-[#e6edf3] text-xs overflow-x-auto font-mono">
                    {endpoint.response}
                  </pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base md:text-lg font-display">{t("Error Codes")}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t("Common error responses and their meanings")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left p-2 md:p-3 text-xs font-medium text-muted-foreground uppercase">{t("Code")}</th>
                    <th className="text-left p-2 md:p-3 text-xs font-medium text-muted-foreground uppercase">{t("Message")}</th>
                    <th className="text-left p-2 md:p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">{t("Description")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: "invalid_key", message: t("Invalid API key"), desc: t("Check your API key") },
                    { code: "insufficient_funds", message: t("Insufficient balance"), desc: t("Add funds to your wallet") },
                    { code: "invalid_service", message: t("Invalid service ID"), desc: t("Service not found or inactive") },
                    { code: "invalid_quantity", message: t("Invalid quantity"), desc: t("Check min/max limits") },
                    { code: "invalid_link", message: t("Invalid link"), desc: t("Provide a valid URL") },
                    { code: "order_not_found", message: t("Order not found"), desc: t("Check order ID") },
                    { code: "refill_not_available", message: t("Refill not available"), desc: t("Service doesn't support refills") }
                  ].map((error, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-secondary/5">
                      <td className="p-2 md:p-3 font-mono text-destructive">{error.code}</td>
                      <td className="p-2 md:p-3">{error.message}</td>
                      <td className="p-2 md:p-3 text-muted-foreground hidden sm:table-cell">{error.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiDocs;
