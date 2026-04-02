import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  CheckCircle2,
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

const PLATFORMS = [
  "Instagram", "YouTube", "TikTok", "Telegram", "X", "Facebook",
  "Spotify", "Discord", "Twitch", "Snapchat", "WhatsApp", "Threads",
  "LinkedIn", "Pinterest", "Reddit", "Apple", "Websites", "Apps",
  "SEO/Backlinks", "Blog", "Other",
];
const SECONDARY_ADMIN_EMAIL = "samgho54@gmail.com";
const SECONDARY_ADMIN_PROVIDER_MULTIPLIER = 2;
const BATCH_SIZE = 50;

// ─── Price helpers ────────────────────────────────────────────────────────────

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

function toUSD(raw: string | number): number {
  const value = parseRawPrice(raw);
  return value <= 0 || isNaN(value) ? 0 : value;
}

// ─── Platform detector ────────────────────────────────────────────────────────

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
  if (text.includes("website") || text.includes("traffic") || text.includes("visitors")) return "Websites";
  if (text.includes(" app ") || text.includes("app installs") || text.includes("play store")) return "Apps";
  if (text.includes("seo") || text.includes("backlink")) return "SEO/Backlinks";
  if (text.includes("blog")) return "Blog";
  return "Other";
}

// ─── Panel sync helpers ───────────────────────────────────────────────────────

type SyncedService = {
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

function buildPanelPayload(s: SyncedService) {
  return {
    name: s.name,
    description: s.description || s.name,
    platform: s.platform || "Other",
    category: s.category || "General",
    min_quantity: Number(s.min_quantity) || 100,
    max_quantity: Number(s.max_quantity) || 50000,
    price: Number(s.base_price) || 0,
    refill_supported: Boolean(s.refill_supported),
    dripfeed_supported: Boolean(s.dripfeed_supported),
    auto_refill_supported: false,
    is_visible: Boolean(s.is_active),
    provider_service_uuid: s.id,
  };
}

/**
 * Sync a small batch of services into panel_services.
 * Called once per import batch — never sends 1700 rows at once.
 */
async function syncPanelBatch(providerServices: SyncedService[]) {
  if (!providerServices.length) return;

  const providerUuids = providerServices.map((s) => s.id);
  const desiredPanelIds = providerServices.map((s) => Number(s.service_id));

  const [{ data: existingPanels }, { data: collidingRows }] = await Promise.all([
    supabase
      .from("panel_services")
      .select("id, provider_service_uuid, service_id")
      .in("provider_service_uuid", providerUuids),
    supabase
      .from("panel_services")
      .select("service_id")
      .in("service_id", desiredPanelIds),
  ]);

  const panelByUuid = new Map(
    (existingPanels || []).map((p) => [p.provider_service_uuid, p])
  );
  const usedPanelIds = new Set(
    (collidingRows || []).map((p) => Number(p.service_id))
  );

  const toInsert: any[] = [];

  for (const service of providerServices) {
    const existing = panelByUuid.get(service.id);
    const payload = buildPanelPayload(service);

    if (existing) {
      const { error } = await supabase
        .from("panel_services")
        .update(payload)
        .eq("id", existing.id);
      if (error) console.error("panel update error:", error.message);
      continue;
    }

    let panelId = Number(service.service_id);
    while (usedPanelIds.has(panelId)) panelId += 1;
    usedPanelIds.add(panelId);
    toInsert.push({ service_id: panelId, ...payload });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("panel_services").insert(toInsert);
    if (error) console.error("panel insert error:", error.message);
  }
}

// ─── Get next safe service_id ─────────────────────────────────────────────────

async function getNextServiceIdBase(): Promise<number> {
  const { data } = await supabase
    .from("services")
    .select("service_id")
    .order("service_id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.service_id) + 1 : 10001;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [importDone, setImportDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [marginPercent, setMarginPercent] = useState("100");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // ── Fetch from provider API ────────────────────────────────────────────────

  const fetchServices = async () => {
    if (!apiUrl || !apiKey) {
      toast({ title: "Please enter API URL and Key", variant: "destructive" });
      return;
    }
    setLoading(true);
    setServices([]);
    setSelected(new Set());
    setImportDone(false);
    try {
      const response = await supabase.functions.invoke("sync-provider", {
        body: { action: "fetch-preview", apiUrl: apiUrl.trim(), apiKey: apiKey.trim() },
      });
      if (response.error) throw new Error(response.error.message);
      const data = response.data;
      if (!Array.isArray(data?.services)) {
        throw new Error(data?.error || "Invalid response from provider API");
      }
      setServices(data.services);
      toast({ title: `Fetched ${data.services.length} services from provider` });
    } catch (err: any) {
      toast({
        title: "Failed to fetch services",
        description: err.message || "Unable to reach provider API",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // ── Filtered + grouped views ───────────────────────────────────────────────

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

  const groupedByCategory = filteredServices.reduce(
    (acc, s) => {
      const cat = s.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {} as Record<string, ProviderService[]>
  );

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleSelectAll = () => {
    if (selected.size === filteredServices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredServices.map((s) => s.service)));
    }
  };

  const toggleService = (id: string | number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleCategory = (cat: string) => {
    const catServices = groupedByCategory[cat] || [];
    const allSelected = catServices.every((s) => selected.has(s.service));
    const next = new Set(selected);
    if (allSelected) catServices.forEach((s) => next.delete(s.service));
    else catServices.forEach((s) => next.add(s.service));
    setSelected(next);
  };

  const toggleExpand = (cat: string) => {
    const next = new Set(expandedCategories);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setExpandedCategories(next);
  };

  // ── Main import ────────────────────────────────────────────────────────────

  const importSelected = async () => {
    if (selected.size === 0) {
      toast({ title: "No services selected", variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportDone(false);
    setImportProgress({ done: 0, total: selected.size });

    const margin = parseFloat(marginPercent) / 100;
    const toImport = services.filter((s) => selected.has(s.service));

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      // ── Step 1: Upsert provider record ──────────────────────────────────
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
          const { data: newProv, error: provErr } = await supabase
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
          if (provErr) throw new Error("Failed to save provider: " + provErr.message);
          providerId = newProv.id;
        }
      }

      // ── Step 2: Get sequential ID base — zero collisions guaranteed ─────
      let nextServiceId = await getNextServiceIdBase();

      // ── Step 3: Process in true BATCH_SIZE-row chunks ────────────────────
      for (let batchStart = 0; batchStart < toImport.length; batchStart += BATCH_SIZE) {
        const batch = toImport.slice(batchStart, batchStart + BATCH_SIZE);
        const batchProviderIds = batch.map((s) => String(s.service));

        // Check which services in this batch already exist in DB
        const { data: existingRows, error: lookupErr } = providerId
          ? await supabase
              .from("services")
              .select("id, provider_service_id")
              .eq("provider_id", providerId)
              .in("provider_service_id", batchProviderIds)
          : { data: [], error: null };

        if (lookupErr) {
          console.error("Lookup error on batch", batchStart, lookupErr.message);
          errorCount += batch.length;
          setImportProgress({ done: batchStart + batch.length, total: toImport.length });
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }

        const existingMap = new Map(
          (existingRows || []).map((r) => [r.provider_service_id, r.id])
        );

        const toInsertBatch: any[] = [];
        const toUpdateBatch: { uuid: string; data: any }[] = [];

        for (const service of batch) {
          const platform = detectPlatform(service.category, service.name);
          const providerPrice = toUSD(service.rate);
          const effectivePrice = isSecondaryAdmin
            ? providerPrice * SECONDARY_ADMIN_PROVIDER_MULTIPLIER
            : providerPrice;
          const basePrice = effectivePrice * (1 + margin);
          const providerServiceId = String(service.service);

          if (basePrice > 50000) {
            skippedCount += 1;
            continue;
          }

          const commonFields = {
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
            toUpdateBatch.push({
              uuid: existingMap.get(providerServiceId)!,
              data: {
                provider_price: commonFields.provider_price,
                base_price: commonFields.base_price,
                min_quantity: commonFields.min_quantity,
                max_quantity: commonFields.max_quantity,
                refill_supported: commonFields.refill_supported,
                dripfeed_supported: commonFields.dripfeed_supported,
                is_active: true,
              },
            });
          } else {
            toInsertBatch.push({ ...commonFields, service_id: nextServiceId });
            nextServiceId += 1;
          }
        }

        // Execute updates
        for (const { uuid, data } of toUpdateBatch) {
          const { error } = await supabase.from("services").update(data).eq("id", uuid);
          if (error) {
            console.error("Update error:", error.message);
            errorCount += 1;
          } else {
            updatedCount += 1;
          }
        }

        // Execute inserts — try as batch first, fall back to one-by-one
        if (toInsertBatch.length > 0) {
          const { error: insertErr } = await supabase.from("services").insert(toInsertBatch);
          if (insertErr) {
            console.error(`Batch insert at ${batchStart} failed (${insertErr.message}), retrying individually…`);
            // One-by-one fallback rescues as many rows as possible
            for (const row of toInsertBatch) {
              const { error: singleErr } = await supabase.from("services").insert(row);
              if (singleErr) {
                console.error("Single insert failed:", singleErr.message, "row service_id:", row.service_id);
                errorCount += 1;
              } else {
                addedCount += 1;
              }
            }
          } else {
            addedCount += toInsertBatch.length;
          }
        }

        // ── Step 4: Sync THIS batch to panel_services right away ───────────
        if (providerId) {
          const syncedProvServiceIds = [
            ...toInsertBatch.map((r) => r.provider_service_id),
            ...(existingRows || [])
              .filter((r) => toUpdateBatch.some((u) => u.uuid === r.id))
              .map((r) => r.provider_service_id),
          ].filter(Boolean) as string[];

          if (syncedProvServiceIds.length > 0) {
            const { data: syncedRows, error: syncFetchErr } = await supabase
              .from("services")
              .select(
                "id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported, is_active"
              )
              .eq("provider_id", providerId)
              .in("provider_service_id", syncedProvServiceIds);

            if (!syncFetchErr && syncedRows?.length) {
              try {
                await syncPanelBatch(syncedRows);
              } catch (panelErr: any) {
                console.error("Panel sync error:", panelErr.message);
              }
            }
          }
        }

        setImportProgress({ done: Math.min(batchStart + BATCH_SIZE, toImport.length), total: toImport.length });

        // Breathing room between batches — prevents gateway timeouts
        await new Promise((r) => setTimeout(r, 120));
      }

      // ── Step 5: Stamp provider last_sync_at ──────────────────────────────
      if (providerId) {
        await supabase
          .from("api_providers")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", providerId);
      }

      setImportDone(true);
      toast({
        title: "Import Complete ✓",
        description: [
          `Added: ${addedCount}`,
          `Updated: ${updatedCount}`,
          skippedCount > 0 ? `Skipped: ${skippedCount} (price > $50k)` : null,
          errorCount > 0 ? `Errors: ${errorCount} (check console)` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
      setSelected(new Set());
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    }

    setImporting(false);
  };

  const allFilteredSelected =
    filteredServices.length > 0 && filteredServices.every((s) => selected.has(s.service));
  const progressPercent =
    importProgress.total > 0
      ? Math.round((importProgress.done / importProgress.total) * 100)
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Provider config card */}
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
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Fetch Services
          </Button>
        </CardContent>
      </Card>

      {/* Service list + import */}
      {services.length > 0 && (
        <Card className="border-border/30 bg-card/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-display">
                  Market Execution
                  <Badge variant="outline" className="ml-2 font-mono">
                    {services.length} services
                  </Badge>
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
                <Button
                  onClick={importSelected}
                  disabled={importing || selected.size === 0}
                  className="self-end"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing…
                    </>
                  ) : importDone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                      Done
                    </>
                  ) : (
                    `Import ${selected.size} Services`
                  )}
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            {(importing || importDone) && importProgress.total > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {importDone ? "✓ Complete" : `Processing — ${BATCH_SIZE}/batch`}
                  </span>
                  <span>
                    {importProgress.done} / {importProgress.total} ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter services..."
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
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {allFilteredSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>

            {/* Price preview table */}
            <div className="mt-2 rounded-lg border border-border/30 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary/20">
                  <tr>
                    <th className="text-left px-3 py-2">Service (preview)</th>
                    <th className="text-right px-3 py-2">Provider Rate</th>
                    <th className="text-right px-3 py-2">
                      Panel Price ({marginPercent}% margin)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {services.slice(0, 5).map((s) => {
                    const pUSD = toUSD(s.rate);
                    const panelUSD = pUSD * (1 + parseFloat(marginPercent || "0") / 100);
                    return (
                      <tr key={s.service} className="border-b border-border/10">
                        <td className="px-3 py-2 truncate max-w-[200px]">{s.name}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{(pUSD * 92).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono text-primary">
                          ₹{(panelUSD * 92).toFixed(2)}
                        </td>
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
                const allCatSelected = catServices.every((s) => selected.has(s.service));
                const selectedInCat = catServices.filter((s) => selected.has(s.service)).length;

                return (
                  <div key={category} className="border border-border/20 rounded-lg overflow-hidden">
                    {/* Category header */}
                    <div
                      className="flex items-center gap-3 p-3 bg-secondary/20 cursor-pointer select-none"
                      onClick={() => toggleExpand(category)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <Checkbox
                        checked={allCatSelected}
                        onCheckedChange={() => toggleCategory(category)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="font-medium text-sm flex-1">{category}</span>
                      <span className="text-xs text-muted-foreground mr-2">
                        {selectedInCat}/{catServices.length} selected
                      </span>
                    </div>

                    {/* Service rows */}
                    {isExpanded && (
                      <div className="divide-y divide-border/10">
                        {catServices.map((service) => {
                          const pRate = toUSD(service.rate);
                          const panelRate =
                            pRate * (1 + parseFloat(marginPercent || "0") / 100);
                          const isSelected = selected.has(service.service);

                          return (
                            <div
                              key={service.service}
                              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/10 ${
                                isSelected ? "bg-primary/5" : ""
                              }`}
                              onClick={() => toggleService(service.service)}
                            >
                              <Checkbox checked={isSelected} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{service.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  ID: {service.service} · min {service.min} · max {service.max}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">
                                  Provider: ₹{(pRate * 92).toFixed(2)}
                                </p>
                                <p className="text-xs font-medium text-primary">
                                  Panel: ₹{(panelRate * 92).toFixed(2)}
                                </p>
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
