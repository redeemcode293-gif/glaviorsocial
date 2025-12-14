import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  Bell,
  TrendingUp,
  Globe,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Server
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeServices: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    await fetchAdminData();
    setLoading(false);
  };

  const fetchAdminData = async () => {
    // Fetch stats
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { count: servicesCount } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true);
    
    const { data: revenueData } = await supabase.from('orders').select('price').eq('status', 'completed');
    const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    setStats({
      totalUsers: usersCount || 0,
      totalOrders: ordersCount || 0,
      totalRevenue,
      activeServices: servicesCount || 0
    });

    // Fetch recent users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setUsers(usersData || []);

    // Fetch services
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .order('service_id', { ascending: true });
    setServices(servicesData || []);

    // Fetch recent orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setOrders(ordersData || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center">
              <Settings className="h-5 w-5 text-destructive-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Glavior Social Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <Globe className="h-4 w-4 mr-2" />
              User Dashboard
            </Button>
            <Badge variant="destructive">Admin Mode</Badge>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-display font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-display font-bold">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-display font-bold">${stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Services</p>
                  <p className="text-2xl font-display font-bold">{stats.activeServices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-secondary/30">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">User Management</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search users..." className="pl-9 w-64 bg-secondary/30 border-border/30" />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchAdminData}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No users registered yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Country</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">VIP Tier</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Joined</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-border/20 hover:bg-secondary/10">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-foreground">{user.full_name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm">{user.country || 'Unknown'}</span>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">{user.vip_tier || 'Standard'}</Badge>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-muted-foreground">
                                {new Date(user.created_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">Service Management</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No services configured yet</p>
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Service
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">ID</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Service</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Platform</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Base Price</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((service) => (
                          <tr key={service.id} className="border-b border-border/20 hover:bg-secondary/10">
                            <td className="p-3 font-mono text-sm">{service.service_id}</td>
                            <td className="p-3">
                              <p className="font-medium text-foreground">{service.name}</p>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{service.platform}</Badge>
                            </td>
                            <td className="p-3 font-mono">${Number(service.base_price).toFixed(4)}</td>
                            <td className="p-3">
                              <Badge variant={service.is_active ? "success" : "secondary"}>
                                {service.is_active ? "Active" : "Disabled"}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">Order Management</CardTitle>
                  <Button variant="outline" size="icon" onClick={fetchAdminData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No orders placed yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Order ID</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Link</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Quantity</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Price</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-border/20 hover:bg-secondary/10">
                            <td className="p-3 font-mono text-sm text-primary">{order.order_number}</td>
                            <td className="p-3 max-w-[200px] truncate text-sm">{order.link}</td>
                            <td className="p-3">{order.quantity.toLocaleString()}</td>
                            <td className="p-3 font-mono">${Number(order.price).toFixed(2)}</td>
                            <td className="p-3">
                              <Badge variant={
                                order.status === 'completed' ? 'success' :
                                order.status === 'processing' ? 'cyan' :
                                order.status === 'cancelled' ? 'destructive' : 'gold'
                              }>
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-border/30 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-lg font-display">API Providers</CardTitle>
                  <CardDescription>Manage SMM API providers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Server className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">No API providers configured</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Provider
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-lg font-display">Region Multipliers</CardTitle>
                  <CardDescription>Configure regional pricing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                    <span className="font-medium">Tier A (USA, UAE, etc.)</span>
                    <Input type="number" defaultValue="2.5" className="w-24 bg-secondary/30" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                    <span className="font-medium">Tier B (UK, EU, etc.)</span>
                    <Input type="number" defaultValue="2.0" className="w-24 bg-secondary/30" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                    <span className="font-medium">Tier C (Brazil, Turkey, etc.)</span>
                    <Input type="number" defaultValue="1.3" className="w-24 bg-secondary/30" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                    <span className="font-medium">Tier D (India, etc.)</span>
                    <Input type="number" defaultValue="1.0" className="w-24 bg-secondary/30" />
                  </div>
                  <Button className="w-full">Save Multipliers</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;