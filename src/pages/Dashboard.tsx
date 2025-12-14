import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Wallet, 
  ShoppingCart, 
  TrendingUp, 
  Plus,
  LayoutDashboard,
  Package,
  History,
  Settings,
  Users,
  LogOut,
  Bell,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Megaphone,
  Key
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
  { icon: ShoppingCart, label: "New Order", href: "/dashboard/order" },
  { icon: Package, label: "My Orders", href: "/dashboard/orders" },
  { icon: History, label: "Transactions", href: "/dashboard/transactions" },
  { icon: Wallet, label: "Add Funds", href: "/dashboard/funds" },
  { icon: Users, label: "Referrals", href: "/dashboard/referrals" },
  { icon: Globe, label: "Reseller Panel", href: "/dashboard/reseller", badge: "PRO" },
  { icon: Key, label: "API", href: "/dashboard/api" },
  { icon: MessageSquare, label: "Support", href: "/dashboard/support" },
  { icon: Megaphone, label: "Updates", href: "/dashboard/updates" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const Dashboard = () => {
  const { user, profile, wallet, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    spentThisMonth: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    // Fetch recent orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4);

    if (orders) {
      setRecentOrders(orders.map(order => ({
        id: `#${order.order_number}`,
        service: order.link.substring(0, 30) + '...',
        quantity: order.quantity.toLocaleString(),
        status: order.status,
        date: new Date(order.created_at).toLocaleString()
      })));
    }

    // Fetch stats
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get this month's spending
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyOrders } = await supabase
      .from('orders')
      .select('price')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    const spentThisMonth = monthlyOrders?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    setStats({
      totalOrders: ordersCount || 0,
      spentThisMonth
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const balance = wallet?.balance || 0;
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/30">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-foreground">GLAVIOR</span>
              <span className="text-[10px] font-medium text-primary tracking-widest">SOCIAL</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                item.active 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <Badge variant="gold" className="ml-auto text-[10px]">{item.badge}</Badge>
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground mt-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {displayName.split(' ')[0]}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="glass" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground">3</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="glass" className="group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <Link to="/dashboard/funds">
                    <Button variant="ghost" size="sm" className="text-primary">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                <p className="text-3xl font-bold text-gradient-cyan">${balance.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <ShoppingCart className="h-6 w-6 text-accent" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalOrders}</p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Spent This Month</p>
                <p className="text-3xl font-bold text-foreground">${stats.spentThisMonth.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Orders */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/dashboard/order">
                  <Button variant="hero" className="w-full justify-between">
                    New Order
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/dashboard/funds">
                  <Button variant="gold" className="w-full justify-between">
                    Add Funds
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/services">
                  <Button variant="glass" className="w-full justify-between">
                    View All Services
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card variant="glass" className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <Link to="/dashboard/orders">
                  <Button variant="ghost" size="sm" className="text-primary">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No orders yet</p>
                    <Link to="/dashboard/order">
                      <Button className="mt-4">Place Your First Order</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            order.status === 'completed' ? 'bg-emerald-500/10' :
                            order.status === 'processing' ? 'bg-primary/10' : 'bg-accent/10'
                          }`}>
                            {order.status === 'completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : order.status === 'processing' ? (
                              <Clock className="h-5 w-5 text-primary" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-accent" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{order.service}</p>
                            <p className="text-sm text-muted-foreground">{order.id} • {order.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              order.status === 'completed' ? 'success' :
                              order.status === 'processing' ? 'cyan' : 'gold'
                            }
                          >
                            {order.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{order.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
