import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Telegram", "X", "Facebook", "Spotify", "Discord", "Twitch", "Snapchat", "WhatsApp", "Threads", "LinkedIn", "Pinterest", "Reddit", "Apple", "Websites", "Apps", "SEO/Backlinks", "Blog", "Other"];
const SECONDARY_ADMIN_EMAIL = 'samgho54@gmail.com';
const SECONDARY_ADMIN_PROVIDER_MULTIPLIER = 2;

/**
 * parseRawPrice — handles USD and INR formats, strips all currency symbols.
 * Removes ALL commas before parseFloat so prices are processed accurately.
 */
function parseRawPrice(raw: string | number): number {
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  let cleaned = String(raw).replace(/[₹Rs$€£\s]/gi, "").trim();
  const dotParts = cleaned.split(".");
  if (dotParts.length > 2) {
    const intPart = dotParts.slice(0, -1).join("").replace(/,/g, "");
    cleaned = intPart + "." + dotParts[dotParts.length - 1];
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * toUSD — STRICT FIX: This function now trusts the provider's raw rate.
 * We no longer divide by 92 or guess based on the value size.
 */
function toUSD(raw: string | number): number {
  const value = parseRawPrice(raw);
  if (value <= 0 || isNaN(value)) return 0;
  return value; // Direct passthrough - trust the source.
}

function detectPlatform(category: string, name: string): string {
  const text = (category + " " + name).toLowerCase();
  if (text.includes("instagram") || text.includes(" ig ") || text.includes("igtv")) return "Instagram";
  if (text.includes("youtube") || text.includes(" yt ")) return "YouTube";
  if (text.includes("tiktok") || text.includes("tik tok")) return "TikTok";
  if (text.includes("telegram") || text.includes(" tg ")) return "Telegram";
  if (text.includes("twitter") || text.includes(" x ") || text.match(/\bx\b/)) return "X";
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
  if (text.includes("apple") || text.includes("itunes") || text.includes("ios")) return "Apple";
  if (text.includes('website') || text.includes('traffic') || text.includes('visitors')) return 'Websites';
  if (text.includes(' app ') || text.includes('app installs') || text.includes('play store')) return 'Apps';
  if (text.includes('seo') || text.includes('backlink')) return 'SEO/Backlinks';
  if (text.includes('blog')) return 'Blog';
  return "Other";
}

type SyncedProviderService = {
  id: string;
  service_id: number;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  base_price: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean | null;
  dripfeed_supported: boolean | null;
  is_active: boolean;
};

function buildPanelPayload(service: SyncedProviderService) {
  return {
    name: service.name,
    description: service.description || service.name,
    platform: service.platform || "Other",
    category: service.category || "General",
    min_quantity: Number(service.min_quantity) || 100,
    max_quantity: Number(service.max_quantity) || 50000,
    price: Number(service.base_price) || 0,
    refill_supported: Boolean(service.refill_supported),
    dripfeed_supported: Boolean(service.dripfeed_supported),
    auto_refill_supported: false,
    is_visible: Boolean(service.is_active),
    provider_service_uuid: service.id,
  };
}

async function syncPanelServices(providerServices: SyncedProviderService[]) {
  if (!providerServices.length) return;

  const providerIds = providerServices.map((service) => service.id);
  const desiredPanelIds = providerServices.map((service) => service.service_id);

  const [{ data: existingPanels }, { data: collidingIds }] = await Promise.all([
    supabase
      .from("panel_services")
      .select("id, provider_service_uuid, service_id")
      .in("provider_service_uuid", providerIds),
    supabase
      .from("panel_services")
      .select("service_id")
      .in("service_id", desiredPanelIds),
  ]);

  const panelsByProvider = new Map((existingPanels || []).map((panel) => [panel.provider_service_uuid, panel]));
  const usedIds = new Set((collidingIds || []).map((panel) => Number(panel.service_id)));
  const inserts: any[] = [];

  for (const service of providerServices) {
    const existingPanel = panelsByProvider.get(service.id);
    const payload = buildPanelPayload(service);

    if (existingPanel) {
      const { error } = await supabase.from("panel_services").update(payload).eq("id", existingPanel.id);
      if (error) throw error;
      continue;
    }

    let nextPanelId = Number(service.service_id) || Math.floor(1000 + Math.random() * 9000);
    while (usedIds.has(nextPanelId)) nextPanelId += 1;
    usedIds.add(nextPanelId);
    inserts.push({ service_id: nextPanelId, ...payload });
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("panel_services").insert(inserts);
    if (error) throw error;
  }
}

export const BulkServiceImport = () => {
  const { user } = useAuth();
  const isSecondaryAdmin = user?.email === SECONDARY_ADMIN_EMAIL;
  const { toast } = useToast();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerCurrency, setProviderCurrency] = useState("USD");
  const [services, setServices] = useState<ProviderService[]>([]);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [marginPercent, setMarginPercent] = useState("100"); // Defaulting to your required 100% margin
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [skippedHighPriceCount, setSkippedHighPriceCount] = useState(0);

  const fetchServices = async () => {
    if (!apiUrl || !apiKey) {
      toast({ title: "Please enter API URL and Key", variant: "destructive" });
      return;
    }
    setLoading(true);
    setServices([]);
    setSelected(new Set());
    setSkippedHighPriceCount(0);
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
      const message = err.message || "Unable to fetch provider services";
      toast({ title: "Failed to fetch services", description: message, variant: "destructive" });
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

  const previewHasHighPrice = useMemo(() => {
    const margin = parseFloat(marginPercent || "0") / 100;
    return services.some((service) => {
      const providerPriceUSD = toUSD(service.rate);
      const effectiveProviderPrice = isSecondaryAdmin ? providerPriceUSD * SECONDARY_ADMIN_PROVIDER_MULTIPLIER : providerPriceUSD;
      const panelPriceUSD = effectiveProviderPrice * (1 + margin);
      return panelPriceUSD > 50000;
    });
  }, [services, marginPercent, isSecondaryAdmin]);

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
    setSkippedHighPriceCount(0);

    const margin = parseFloat(marginPercent) / 100;
    const toImport = services.filter((s) => selected.has(s.service));

    try {
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
              currency: providerCurrency,
            })
            .select("id")
            .single();

          if (insertErr) throw new Error("Failed to save provider: " + insertErr.message);
          providerId = newProvider.id;
        }
      }

      let addedCount = 0;
      let updatedCount = 0;
      const syncedProviderServiceIds: string[] = [];
      let errors = 0;

      const BATCH_SIZE = 50;
      for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE);

        const batchIds = batch.map((s) => String(s.service));
        const { data: existingServices } = providerId
          ? await supabase
              .from("services")
              .select("id, provider_service_id")
              .eq("provider_id", providerId)
              .in("provider_service_id", batchIds)
          : { data: [] };

        const existingMap = new Map((existingServices || []).map((service) => [service.provider_service_id, service.id]));

        const toInsertBatch: any[] = [];
        const insertedProviderServiceIds: string[] = [];

        for (const service of batch) {
          const platform = detectPlatform(service.category, service.name);
          const providerPrice = toUSD(service.rate);
          const effectiveProviderPrice = isSecondaryAdmin ? providerPrice * SECONDARY_ADMIN_PROVIDER_MULTIPLIER : providerPrice;
          const basePrice = effectiveProviderPrice * (1 + margin);
          const providerServiceId = String(service.service);

          if (basePrice > 50000) {
            errors += 1;
            continue;
          }

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
            is_active: true,
          };

          if (existingMap.has(providerServiceId)) {
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
            syncedProviderServiceIds.push(providerServiceId);
            updatedCount++;
          } else {
            const internalServiceId = Math.floor(1000 + Math.random() * 9000);
            toInsertBatch.push({ ...serviceData, service_id: internalServiceId });
            insertedProviderServiceIds.push(providerServiceId);
          }
        }

        if (toInsertBatch.length > 0) {
          const { error: insertErr } = await supabase.from("services").insert(toInsertBatch);
          if (!insertErr) {
            addedCount += toInsertBatch.length;
            syncedProviderServiceIds.push(...insertedProviderServiceIds);
          }
        }

        setImportProgress({ done: Math.min(i + BATCH_SIZE, toImport.length), total: toImport.length });
      }

      if (providerId && syncedProviderServiceIds.length > 0) {
        const { data: syncedServices, error: syncedServicesError } = await supabase
          .from('services')
          .select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported, is_active')
          .eq('provider_id', providerId)
          .in('provider_service_id', syncedProviderServiceIds);

        if (syncedServicesError) throw syncedServicesError;
        await syncPanelServices(syncedServices || []);
      }

      if (providerId) {
        await supabase
          .from("api_providers")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", providerId);
      }

      toast({
        title: "Import Complete ✓",
        description: `Added: ${addedCount} new, Updated: ${updatedCount} existing.`,
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
      <Card className="border-border/30 bg-card/60">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Bulk Service Import
          </CardTitle>
          <CardDescription>
            High-leverage service ingestion. Direct USD rates with 1:1 price trust.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Provider Name</Label>
              <Input
                placeholder="e.g., SMM Provider"
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
                placeholder="API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-secondary/30 border-border/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Context</Label>
              <Select value={providerCurrency} onValueChange={setProviderCurrency}>
                <SelectTrigger className="bg-secondary/30 border-border/30">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={fetchServices} disabled={loading} className="w-full md:w-auto">
            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Fetch Services
          </Button>
        </CardContent>
      </Card>

      {services.length > 0 && (
        <Card className="border-border/30 bg-card/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-display">
                  Market Execution
                  <Badge variant="outline" className="ml-2 font-mono">{services.length} services</Badge>
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Margin %</Label>
                  <Input
                    type="number"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(e.target.value)}
                    className="w-20 h-8 bg-secondary/30 border-border/30 text-sm"
                  />
                </div>
                <Button onClick={importSelected} disabled={importing || selected.size === 0}>
                  {importing ? "Importing..." : `Import ${selected.size} Services`}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter database..."
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
                  <SelectItem value="all">All</SelectItem>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {allFilteredSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="mt-2 rounded-lg border border-border/30 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary/20">
                  <tr>
                    <th className="text-left px-3 py-2">Service</th>
                    <th className="text-right px-3 py-2">Provider Rate</th>
                    <th className="text-right px-3 py-2">Panel Cost (100% Margin)</th>
                  </tr>
                </thead>
                <tbody>
                  {services.slice(0, 5).map((s) => {
                    const pUSD = toUSD(s.rate);
                    const panelUSD = pUSD * (1 + parseFloat(marginPercent || "0") / 100);
                    return (
                      <tr key={s.service} className="border-b border-border/10">
                        <td className="px-3 py-2 truncate max-w-[200px]">{s.name}</td>
                        <td className="px-3 py-2 text-right font-mono">${pUSD.toFixed(4)}</td>
                        <td className="px-3 py-2 text-right font-mono text-primary">${panelUSD.toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {Object.entries(groupedByCategory).map(([category, catServices]) => {
                const isExpanded = expandedCategories.has(category);
                return (
                  <div key={category} className="border border-border/20 rounded-lg">
                    <div className="flex items-center gap-3 p-3 bg-secondary/20 cursor-pointer" onClick={() => toggleExpand(category)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Checkbox checked={catServices.every((s) => selected.has(s.service))} onCheckedChange={() => toggleCategory(category)} onClick={(e) => e.stopPropagation()} />
                      <span className="font-medium text-sm flex-1">{category}</span>
                    </div>

                    {isExpanded && (
                      <div className="divide-y divide-border/10">
                        {catServices.map((service) => {
                          const pRate = toUSD(service.rate);
                          const panelRate = pRate * (1 + parseFloat(marginPercent) / 100);
                          return (
                            <div key={service.service} className="flex items-center gap-3 p-3 hover:bg-secondary/10" onClick={() => toggleService(service.service)}>
                              <Checkbox checked={selected.has(service.service)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{service.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">ID: {service.service}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs">Provider: ${pRate.toFixed(4)}</p>
                                <p className="text-xs font-medium text-primary">Panel: ${panelRate.toFixed(4)}</p>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};
