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

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Telegram", "X", "Facebook", "Spotify", "Discord", "Twitch", "Snapchat", "WhatsApp", "Threads", "LinkedIn", "Pinterest", "Reddit", "Apple", "Other"];

/**
 * Locale-aware price parser — strips commas (INR thousand separators like 1,00,000.00 or 15,650.19)
 * before parsing so we never produce millions from thousands.
 */
function parseProviderPrice(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  // Remove currency symbols, spaces
  const cleaned = String(raw).replace(/[₹Rs$€£\s]/g, '').trim();
  // Remove ALL commas (they're thousand-separators in both INR and USD formats)
  const noCommas = cleaned.replace(/,/g, '');
  const parsed = parseFloat(noCommas);
  return isNaN(parsed) ? 0 : parsed;
}

function detectPlatform(category: string, name: string): string {
  const text = (category + " " + name).toLowerCase();
  if (text.includes("instagram")) return "Instagram";
  if (text.includes("youtube")) return "YouTube";
  if (text.includes("tiktok") || text.includes("tik tok")) return "TikTok";
  if (text.includes("telegram")) return "Telegram";
  if (text.includes("twitter") || text.includes(" x ")) return "X";
  if (text.includes("facebook") || text.includes("fb ")) return "Facebook";
  if (text.includes("spotify")) return "Spotify";
  if (text.includes("discord")) return "Discord";
  if (text.includes("twitch")) return "Twitch";
  if (text.includes("snapchat")) return "Snapchat";
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("threads")) return "Threads";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("pinterest")) return "Pinterest";
  if (text.includes("reddit")) return "Reddit";
  if (text.includes("apple") || text.includes("itunes")) return "Apple";
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
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
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
    setImportProgress({ done: 0, total: selected.size });

    const margin = parseFloat(marginPercent) / 100;
    const toImport = services.filter((s) => selected.has(s.service));

    try {
      // Ensure provider exists
      let providerId: string | null = null;

      if (apiUrl && apiKey) {
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

      // Process in batches of 50 for speed
      const BATCH_SIZE = 50;
      for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE);

        // Check which already exist
        const batchIds = batch.map((s) => String(s.service));
        const { data: existingServices } = providerId
          ? await supabase
              .from("services")
              .select("id, provider_service_id")
              .eq("provider_id", providerId)
              .in("provider_service_id", batchIds)
          : { data: [] };

        const existingMap = new Map((existingServices || []).map((s: any) => [s.provider_service_id, s.id]));

        const toInsertBatch: any[] = [];

        for (const service of batch) {
          const platform = detectPlatform(service.category, service.name);
          // Use locale-aware parser to avoid INR comma issues
          const providerPrice = parseProviderPrice(service.rate);
          const basePrice = providerPrice * (1 + margin);
          const providerServiceId = String(service.service);

          const serviceData = {
            name: service.name,
            description: service.description || service.name,
            platform,
            category: service.category || "General",
            provider_id: providerId,
            provider_service_id: providerServiceId,
            provider_price: providerPrice,
            base_price: basePrice,
            min_quantity: parseInt(String(service.min)) || 100,
            max_quantity: parseInt(String(service.max)) || 50000,
            refill_supported: service.refill === true || service.refill === "true",
            dripfeed_supported: service.dripfeed === true || service.dripfeed === "true",
            is_active: true, // Auto-enabled on import
          };

          if (existingMap.has(providerServiceId)) {
            // Update existing
            await supabase
              .from("services")
              .update({
                provider_price: serviceData.provider_price,
                base_price: serviceData.base_price,
                min_quantity: serviceData.min_quantity,
                max_quantity: serviceData.max_quantity,
                refill_supported: serviceData.refill_supported,
                dripfeed_supported: serviceData.dripfeed_supported,
                is_active: true,
              })
              .eq("id", existingMap.get(providerServiceId));
            updatedCount++;
          } else {
            const internalServiceId = Math.floor(100 + Math.random() * 900);
            toInsertBatch.push({ ...serviceData, service_id: internalServiceId });
          }
        }

        // Batch insert new services
        if (toInsertBatch.length > 0) {
          const { error: insertErr } = await supabase.from("services").insert(toInsertBatch);
          if (!insertErr) {
            addedCount += toInsertBatch.length;
          } else {
            console.error("Batch insert error:", insertErr);
            // Fallback: insert one by one
            for (const s of toInsertBatch) {
              const { error: singleErr } = await supabase.from("services").insert(s);
              if (!singleErr) addedCount++;
            }
          }
        }

        setImportProgress({ done: Math.min(i + BATCH_SIZE, toImport.length), total: toImport.length });
      }

      // Update provider last_sync_at
      if (providerId) {
        await supabase
          .from("api_providers")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", providerId);
      }

      toast({
        title: "Import Complete ✓",
        description: `Added: ${addedCount} new, Updated: ${updatedCount} existing. All services are live immediately.`,
      });
      setSelected(new Set());
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    }
    setImporting(false);
    setImportProgress({ done: 0, total: 0 });
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
            Enter your provider API credentials, fetch their service list, then select and import services.
            All imported services are automatically live for users.
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
                <CardDescription>{selected.size} selected • Imported services are immediately visible to users</CardDescription>
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
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> {importProgress.done}/{importProgress.total}...</>
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
                            // Use locale-aware parser
                            const providerPrice = parseProviderPrice(service.rate);
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
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{service.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground font-mono">
                                      ID: {service.service}
                                    </span>
                                    <Badge variant="secondary" className="text-xs h-4 px-1">
                                      {platform}
                                    </Badge>
                                    {service.refill && (
                                      <Badge variant="outline" className="text-xs h-4 px-1 text-success border-success/30">
                                        Refill
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 space-y-0.5">
                                  <p className="text-xs text-muted-foreground">
                                    Provider: ${providerPrice.toFixed(4)}/1K
                                  </p>
                                  <p className="text-xs font-medium text-primary">
                                    Panel: ${ourPrice.toFixed(4)}/1K
                                  </p>
                                </div>
                                <div className="text-right shrink-0 text-xs text-muted-foreground">
                                  {parseInt(String(service.min)).toLocaleString()}–{parseInt(String(service.max)).toLocaleString()}
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
