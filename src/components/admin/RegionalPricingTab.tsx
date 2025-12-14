import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Globe, Plus, Edit, Trash2, RefreshCw, Save, Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Region {
  id: string;
  region_code: string;
  region_name: string;
  multiplier: number;
  countries: string[];
  created_at: string;
  updated_at: string;
}

// Comprehensive country list with codes
const ALL_COUNTRIES = [
  // High Multiplier (Premium)
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  // Western Europe
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  // Moderate
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  // MENA
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  // South/Southeast Asia
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  // East Asia
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  // Africa
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
];

// Default region groups
const DEFAULT_REGIONS = [
  {
    region_code: "GCC",
    region_name: "GCC / Gulf Premium",
    multiplier: 2.25,
    countries: ["AE", "SA", "QA", "KW", "BH", "OM"]
  },
  {
    region_code: "TIER1",
    region_name: "Tier 1 (US/UK/CA/AU)",
    multiplier: 2.0,
    countries: ["US", "GB", "CA", "AU", "NZ"]
  },
  {
    region_code: "WEST_EU",
    region_name: "Western Europe",
    multiplier: 1.7,
    countries: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "IE", "PT", "GR"]
  },
  {
    region_code: "MODERATE",
    region_name: "Moderate (LATAM/East EU)",
    multiplier: 1.4,
    countries: ["TR", "BR", "MX", "AR", "CL", "CO", "PE", "PL", "CZ", "HU", "RO", "RU", "UA"]
  },
  {
    region_code: "MENA",
    region_name: "MENA Non-Gulf",
    multiplier: 1.5,
    countries: ["EG", "MA", "DZ", "TN", "JO", "LB", "IQ", "IR"]
  },
  {
    region_code: "ASIA",
    region_name: "South/Southeast Asia",
    multiplier: 1.2,
    countries: ["ID", "MY", "TH", "VN", "PH", "SG"]
  },
  {
    region_code: "PRICE_SENS",
    region_name: "Price-Sensitive (India/South Asia)",
    multiplier: 1.15,
    countries: ["IN", "PK", "BD", "LK", "NP"]
  },
  {
    region_code: "EAST_ASIA",
    region_name: "East Asia",
    multiplier: 1.6,
    countries: ["JP", "KR", "CN", "TW", "HK"]
  },
  {
    region_code: "AFRICA",
    region_name: "Africa",
    multiplier: 1.15,
    countries: ["ZA", "NG", "KE", "GH", "ET", "TZ", "UG"]
  }
];

export function RegionalPricingTab() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  
  const [form, setForm] = useState({
    region_code: "",
    region_name: "",
    multiplier: "",
    countries: [] as string[]
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('regional_pricing')
      .select('*')
      .order('multiplier', { ascending: false });
    
    if (data) {
      setRegions(data);
      // Count users per region
      const { data: profiles } = await supabase.from('profiles').select('country_code');
      if (profiles) {
        const counts: Record<string, number> = {};
        data.forEach(region => {
          counts[region.id] = profiles.filter(p => 
            region.countries?.includes(p.country_code || '')
          ).length;
        });
        setUserCounts(counts);
      }
    }
    setLoading(false);
  };

  const openEditDialog = (region?: Region) => {
    if (region) {
      setEditingRegion(region);
      setForm({
        region_code: region.region_code,
        region_name: region.region_name,
        multiplier: region.multiplier.toString(),
        countries: region.countries || []
      });
    } else {
      setEditingRegion(null);
      setForm({
        region_code: "",
        region_name: "",
        multiplier: "1.0",
        countries: []
      });
    }
    setEditDialogOpen(true);
  };

  const saveRegion = async () => {
    if (!form.region_code || !form.region_name || !form.multiplier) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const regionData = {
      region_code: form.region_code,
      region_name: form.region_name,
      multiplier: parseFloat(form.multiplier),
      countries: form.countries
    };

    let error;
    if (editingRegion) {
      ({ error } = await supabase.from('regional_pricing').update(regionData).eq('id', editingRegion.id));
    } else {
      ({ error } = await supabase.from('regional_pricing').insert(regionData));
    }

    if (error) {
      toast({ title: "Failed to save region", variant: "destructive" });
    } else {
      toast({ title: editingRegion ? "Region Updated" : "Region Created" });
      setEditDialogOpen(false);
      fetchRegions();
    }
  };

  const deleteRegion = async (id: string) => {
    const { error } = await supabase.from('regional_pricing').delete().eq('id', id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Region Deleted" });
      fetchRegions();
    }
  };

  const initializeDefaults = async () => {
    for (const region of DEFAULT_REGIONS) {
      await supabase.from('regional_pricing').insert(region);
    }
    toast({ title: "Default regions initialized" });
    fetchRegions();
  };

  const toggleCountry = (code: string) => {
    setForm(prev => ({
      ...prev,
      countries: prev.countries.includes(code)
        ? prev.countries.filter(c => c !== code)
        : [...prev.countries, code]
    }));
  };

  const getCountryInfo = (code: string) => {
    return ALL_COUNTRIES.find(c => c.code === code);
  };

  if (loading) {
    return (
      <Card className="border-border/30 bg-card/60">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/30 bg-card/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Regional Pricing Multipliers
              </CardTitle>
              <CardDescription>Define pricing multipliers by country groups (admin-only view)</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchRegions}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {regions.length === 0 && (
                <Button variant="outline" onClick={initializeDefaults}>
                  Initialize Defaults
                </Button>
              )}
              <Button onClick={() => openEditDialog()}>
                <Plus className="h-4 w-4 mr-2" />Add Region
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {regions.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No regional pricing configured</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Initialize Defaults" to set up recommended regions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {regions.map((region) => (
                <div key={region.id} className="p-4 rounded-lg bg-secondary/10 border border-border/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="font-mono">{region.region_code}</Badge>
                        <h3 className="font-medium text-foreground">{region.region_name}</h3>
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {region.multiplier}x
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {userCounts[region.id] || 0} users
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {region.countries?.slice(0, 12).map(code => {
                          const country = getCountryInfo(code);
                          return (
                            <Badge key={code} variant="secondary" className="text-xs gap-1">
                              {country?.flag} {code}
                            </Badge>
                          );
                        })}
                        {(region.countries?.length || 0) > 12 && (
                          <Badge variant="outline" className="text-xs">
                            +{(region.countries?.length || 0) - 12} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(region)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteRegion(region.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRegion ? "Edit Region" : "Add New Region"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Region Code</Label>
                <Input 
                  placeholder="e.g., GCC"
                  value={form.region_code}
                  onChange={(e) => setForm({ ...form, region_code: e.target.value.toUpperCase() })}
                  className="bg-secondary/30"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Region Name</Label>
                <Input 
                  placeholder="e.g., GCC / Gulf Premium"
                  value={form.region_name}
                  onChange={(e) => setForm({ ...form, region_name: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Price Multiplier</Label>
              <div className="flex items-center gap-4">
                <Input 
                  type="number"
                  step="0.05"
                  min="1"
                  max="5"
                  value={form.multiplier}
                  onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                  className="bg-secondary/30 w-32"
                />
                <span className="text-sm text-muted-foreground">
                  Base price × {form.multiplier || "1.0"} = Final user price
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Assign Countries ({form.countries.length} selected)</Label>
              <ScrollArea className="h-[240px] border border-border/30 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ALL_COUNTRIES.map((country) => (
                    <div
                      key={country.code}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                        form.countries.includes(country.code)
                          ? "bg-primary/20 border border-primary/40"
                          : "hover:bg-secondary/50"
                      }`}
                      onClick={() => toggleCountry(country.code)}
                    >
                      <Checkbox 
                        checked={form.countries.includes(country.code)}
                        onCheckedChange={() => toggleCountry(country.code)}
                      />
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{country.name}</p>
                        <p className="text-xs text-muted-foreground">{country.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRegion}>
              <Save className="h-4 w-4 mr-2" />
              {editingRegion ? "Update Region" : "Create Region"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
