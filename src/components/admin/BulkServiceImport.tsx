import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Search,
  Download,
  CheckSquare,
  Square,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";

interface ProviderService {
  service: number | string;
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill?: boolean | string;
  dripfeed?: boolean | string;
  description?: string;
}

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Telegram", "X", "Facebook", "Spotify", "Discord", "Twitch", "Snapchat", "WhatsApp", "Threads", "LinkedIn", "Pinterest"];

function detectPlatform(category: string, name: string): string {
  const text = (category + " " + name).toLowerCase();
  if (text.includes("instagram")) return "Instagram";
  if (text.includes("youtube")) return "YouTube";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("telegram")) return "Telegram";
  if (text.includes("twitter") || text.includes(" x ") || text.includes("twit")) return "X";
  if (text.includes("facebook")) return "Facebook";
  if (text.includes("spotify")) return "Spotify";
  if (text.includes("discord")) return "Discord";
  if (text.includes("twitch")) return "Twitch";
  if (text.includes("snapchat")) return "Snapchat";
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("threads")) return "Threads";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("pinterest")) return "Pinterest";
  return "Other";
}

export const BulkServiceImport = () => {
  const { toast } = useToast();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [providerName, setProviderName] = useState("");
  const [services, setServices] = useState<ProviderService[]>([]);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [marginPercent, setMarginPercent] = useState("30");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchServices = async () => {
    if (!apiUrl || !apiKey) {
      toast({ title: "Please enter API URL and Key", variant: "destructive" });
      return;
    }
    setLoading(true);
    setServices([]);
    setSelected(new Set());
    try {
      // We call via a simple proxy to avoid CORS issues  
      const response = await supabase.functions.invoke("sync-provider", {
        body: {
          action: "fetch-preview",
          apiUrl: apiUrl.trim(),
          apiKey: apiKey.trim(),
        },
      });

      if (response.error) throw new Error(response.error.message);
      const data = response.data;

      if (!Array.isArray(data?.services)) {
        throw new Error(data?.error || "Invalid response from provider API");
      }

      setServices(data.services);
      toast({ title: `Fetched ${data.services.length} services from provider` });
    } catch (err: any) {
      toast({ title: "Failed to fetch services", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const filteredServices = services.filter((s) => {
    const platform = detectPlatform(s.category, s.name);
    const matchesPlatform = platformFilter === "all" || platform === platformFilter;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.service).includes(searchQuery);
    return matchesPlatform && matchesSearch;
  });

  const groupedByCategory = filteredServices.reduce((acc, s) => {
    const cat = s.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, ProviderService[]>);

  const toggleSelectAll = () => {
    if (selected.size === filteredServices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredServices.map((s) => s.service)));
    }
  };

  const toggleService = (id: string | number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleCategory = (cat: string) => {
    const catServices = groupedByCategory[cat] || [];
    const allSelected = catServices.every((s) => selected.has(s.service));
    const next = new Set(selected);
    if (allSelected) {
      catServices.forEach((s) => next.delete(s.service));
    } else {
      catServices.forEach((s) => next.add(s.service));
    }
    setSelected(next);
  };

  const toggleExpand = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const importSelected = async () => {
    if (selected.size === 0) {
      toast({ title: "No services selected", variant: "destructive" });
      return;
    }
    setImporting(true);

    const margin = parseFloat(marginPercent) / 100;
    const toImport = services.filter((s) => selected.has(s.service));

    try {
      // First ensure provider exists (or create it)
      let providerId: string | null = null;

      if (apiUrl && apiKey) {
        // Check if provider already exists
        const { data: existing } = await supabase
          .from("api_providers")
          .select("id")
          .eq("api_url", apiUrl.trim())
          .maybeSingle();

        if (existing) {
          providerId = existing.id;
        } else {
          const { data: newProvider, error: insertErr } = await supabase
            .from("api_providers")
            .insert({
              name: providerName || new URL(apiUrl).hostname,
              api_url: apiUrl.trim(),
              api_key: apiKey.trim(),
              status: "active",
            })
            .select("id")
            .single();

          if (insertErr) throw new Error("Failed to save provider: " + insertErr.message);
          providerId = newProvider.id;
        }
      }

      let addedCount = 0;
      let updatedCount = 0;

      for (const service of toImport) {
        const platform = detectPlatform(service.category, service.name);
        const providerPrice = parseFloat(service.rate) || 0;
        const basePrice = providerPrice * (1 + margin);
        const internalServiceId = Math.floor(100 + Math.random() * 9900);

        // Check if already exists
        const { data: existingService } = await supabase
          .from("services")
          .select("id")
          .eq("provider_id", providerId)
          .eq("provider_service_id", String(service.service))
          .maybeSingle();

        if (existingService) {
          await supabase
            .from("services")
            .update({
              provider_price: providerPrice,
              base_price: basePrice,
              min_quantity: parseInt(service.min) || 100,
              max_quantity: parseInt(service.max) || 50000,
              refill_supported: service.refill === true || service.refill === "true",
              dripfeed_supported: service.dripfeed === true || service.dripfeed === "true",
            })
            .eq("id", existingService.id);
          updatedCount++;
        } else {
          await supabase.from("services").insert({
            name: service.name,
            description: service.description || service.name,
            platform,
            category: service.category || "General",
            service_id: internalServiceId,
            provider_id: providerId,
            provider_service_id: String(service.service),
            provider_price: providerPrice,
            base_price: basePrice,
            min_quantity: parseInt(service.min) || 100,
            max_quantity: parseInt(service.max) || 50000,
            refill_supported: service.refill === true || service.refill === "true",
            dripfeed_supported: service.dripfeed === true || service.dripfeed === "true",
            is_active: true,
          });
          addedCount++;
        }
      }

      // Update provider last_sync_at
      if (providerId) {
        await supabase
          .from("api_providers")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", providerId);
      }

      toast({
        title: "Import Complete",
        description: `Added: ${addedCount}, Updated: ${updatedCount} services`,
      });
      setSelected(new Set());
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    }
    setImporting(false);
  };

  const allFilteredSelected = filteredServices.length > 0 && filteredServices.every((s) => selected.has(s.service));

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <Card className="border-border/30 bg-card/60">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Bulk Service Import
          </CardTitle>
          <CardDescription>
            Enter your provider API credentials, fetch their service list, then select and import any services directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Provider Name (optional)</Label>
              <Input
                placeholder="e.g., SMM Provider 1"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="bg-secondary/30 border-border/30"
              />
            </div>
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                placeholder="https://provider.com/api/v2"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="bg-secondary/30 border-border/30"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-secondary/30 border-border/30"
              />
            </div>
          </div>
          <Button onClick={fetchServices} disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Fetching Services...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Fetch Provider Services</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Services Selection */}
      {services.length > 0 && (
        <Card className="border-border/30 bg-card/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-display">
                  Select Services to Import
                  <Badge variant="outline" className="ml-2 font-mono">{services.length} total</Badge>
                </CardTitle>
                <CardDescription>{selected.size} selected</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Margin %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="500"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(e.target.value)}
                    className="w-20 h-8 bg-secondary/30 border-border/30 text-sm"
                  />
                </div>
                <Button
                  onClick={importSelected}
                  disabled={importing || selected.size === 0}
                  className="self-end"
                >
                  {importing ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Import {selected.size} Services</>
                  )}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/30 border-border/30"
                />
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-40 bg-secondary/30 border-border/30">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={toggleSelectAll} className="self-center gap-2">
                {allFilteredSelected ? (
                  <><CheckSquare className="h-4 w-4" /> Deselect All</>
                ) : (
                  <><Square className="h-4 w-4" /> Select All</>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {filteredServices.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">No services match your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedByCategory).map(([category, catServices]) => {
                  const catSelected = catServices.filter((s) => selected.has(s.service)).length;
                  const allCatSelected = catSelected === catServices.length;
                  const isExpanded = expandedCategories.has(category);

                  return (
                    <div key={category} className="border border-border/20 rounded-lg overflow-hidden">
                      {/* Category Row */}
                      <div
                        className="flex items-center gap-3 p-3 bg-secondary/20 cursor-pointer hover:bg-secondary/30 transition-colors"
                        onClick={() => toggleExpand(category)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <Checkbox
                          checked={allCatSelected}
                          onCheckedChange={() => { toggleCategory(category); }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        />
                        <span className="font-medium text-sm flex-1">{category}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {catSelected}/{catServices.length}
                        </Badge>
                      </div>

                      {/* Services in category */}
                      {isExpanded && (
                        <div className="divide-y divide-border/10">
                          {catServices.map((service) => {
                            const platform = detectPlatform(service.category, service.name);
                            const providerPrice = parseFloat(service.rate) || 0;
                            const ourPrice = providerPrice * (1 + parseFloat(marginPercent) / 100);

                            return (
                              <div
                                key={service.service}
                                className={`flex items-center gap-3 p-3 hover:bg-secondary/10 transition-colors cursor-pointer ${
                                  selected.has(service.service) ? "bg-primary/5" : ""
                                }`}
                                onClick={() => toggleService(service.service)}
                              >
                                <Checkbox
                                  checked={selected.has(service.service)}
                                  onCheckedChange={() => toggleService(service.service)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono text-muted-foreground">#{service.service}</span>
                                    <p className="text-sm font-medium text-foreground truncate">{service.name}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">{platform}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Min: {service.min} · Max: {service.max}
                                    </span>
                                    {(service.refill === true || service.refill === "true") && (
                                      <Badge variant="outline" className="text-xs">Refill</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs text-muted-foreground">Cost: ${providerPrice.toFixed(3)}</p>
                                  <p className="text-sm font-mono text-success">Our: ${ourPrice.toFixed(3)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
