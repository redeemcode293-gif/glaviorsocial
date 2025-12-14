import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  Globe,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Ban,
  Save,
  Wallet,
  MessageSquare,
  CreditCard,
  Activity,
  Shield
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
    activeServices: 0,
    pendingDeposits: 0,
    openTickets: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [regionalPricing, setRegionalPricing] = useState<any[]>([]);
  const [userCountByRegion, setUserCountByRegion] = useState<Record<string, number>>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceAdjustment, setBalanceAdjustment] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "deduct">("add");
  const [userSearchQuery, setUserSearchQuery] = useState("");
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
    const { count: pendingDepositsCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'pending');
    const { count: openTicketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
    
    const { data: revenueData } = await supabase.from('orders').select('price').eq('status', 'completed');
    const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.price), 0) || 0;

    setStats({
      totalUsers: usersCount || 0,
      totalOrders: ordersCount || 0,
      totalRevenue,
      activeServices: servicesCount || 0,
      pendingDeposits: pendingDepositsCount || 0,
      openTickets: openTicketsCount || 0
    });

    // Fetch users with country info
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setUsers(usersData || []);

    // Fetch wallets for all users
    if (usersData && usersData.length > 0) {
      const userIds = usersData.map(u => u.user_id);
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('*')
        .in('user_id', userIds);
      
      const walletsMap: Record<string, any> = {};
      walletsData?.forEach(w => {
        walletsMap[w.user_id] = w;
      });
      setWallets(walletsMap);
    }

    // Calculate user count by country code for regional pricing
    const countByCountry: Record<string, number> = {};
    usersData?.forEach(u => {
      const code = u.country_code || 'XX';
      countByCountry[code] = (countByCountry[code] || 0) + 1;
    });
    setUserCountByRegion(countByCountry);

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
      .limit(100);
    setOrders(ordersData || []);

    // Fetch pending deposits
    const { data: depositsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(50);
    setDeposits(depositsData || []);

    // Fetch open tickets
    const { data: ticketsData } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setTickets(ticketsData || []);

    // Fetch regional pricing
    const { data: pricingData } = await supabase
      .from('regional_pricing')
      .select('*')
      .order('multiplier', { ascending: true });
    setRegionalPricing(pricingData || []);
  };

  const adjustUserBalance = async () => {
    if (!selectedUser || !balanceAdjustment) return;

    const amount = parseFloat(balanceAdjustment);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }

    const userWallet = wallets[selectedUser.user_id];
    if (!userWallet) {
      toast({ title: "Wallet not found", variant: "destructive" });
      return;
    }

    const newBalance = adjustmentType === "add" 
      ? Number(userWallet.balance) + amount 
      : Number(userWallet.balance) - amount;

    if (newBalance < 0) {
      toast({ title: "Cannot deduct more than current balance", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', selectedUser.user_id);

    if (error) {
      toast({ title: "Failed to update balance", variant: "destructive" });
    } else {
      toast({ title: "Balance Updated", description: `New balance: $${newBalance.toFixed(2)}` });
      setSelectedUser(null);
      setBalanceAdjustment("");
      fetchAdminData();
    }
  };

  const updateUserPricingOverride = async (userId: string, override: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ pricing_override: override })
      .eq('user_id', userId);

    if (error) {
      toast({ title: "Failed to update pricing", variant: "destructive" });
    } else {
      toast({ title: "Pricing Updated" });
      fetchAdminData();
    }
  };

  const approveDeposit = async (deposit: any) => {
    // Update transaction status
    const { error: txError } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', deposit.id);

    if (txError) {
      toast({ title: "Failed to approve deposit", variant: "destructive" });
      return;
    }

    // Credit user wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, total_deposited')
      .eq('user_id', deposit.user_id)
      .single();

    if (wallet) {
      await supabase
        .from('wallets')
        .update({ 
          balance: Number(wallet.balance) + Number(deposit.amount),
          total_deposited: Number(wallet.total_deposited) + Number(deposit.amount)
        })
        .eq('user_id', deposit.user_id);
    }

    toast({ title: "Deposit Approved", description: `$${deposit.amount} credited to user` });
    fetchAdminData();
  };

  const rejectDeposit = async (depositId: string) => {
    await supabase
      .from('transactions')
      .update({ status: 'rejected' })
      .eq('id', depositId);

    toast({ title: "Deposit Rejected" });
    fetchAdminData();
  };

  const replyToTicket = async (ticketId: string, message: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      user_id: user.id,
      message,
      is_admin: true
    });

    await supabase
      .from('support_tickets')
      .update({ status: 'pending' })
      .eq('id', ticketId);

    toast({ title: "Reply Sent" });
    fetchAdminData();
  };

  const closeTicket = async (ticketId: string) => {
    await supabase
      .from('support_tickets')
      .update({ status: 'closed' })
      .eq('id', ticketId);

    toast({ title: "Ticket Closed" });
    fetchAdminData();
  };

  const filteredUsers = users.filter(u => 
    userSearchQuery === "" ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const updateRegionalPricing = async (id: string, multiplier: number) => {
    const { error } = await supabase
      .from('regional_pricing')
      .update({ multiplier })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update pricing",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Updated",
        description: "Regional pricing updated successfully",
      });
      fetchAdminData();
    }
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

  if (!isAdmin) return null;

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
          <TabsList className="bg-secondary/30 flex-wrap h-auto p-1">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="deposits">
              Deposits
              {stats.pendingDeposits > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{stats.pendingDeposits}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="tickets">
              Tickets
              {stats.openTickets > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{stats.openTickets}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="pricing">Regional Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">User Management</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search users..." 
                        className="pl-9 w-64 bg-secondary/30 border-border/30"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
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
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Balance</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Pricing</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Joined</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => {
                          const userWallet = wallets[user.user_id];
                          return (
                            <tr key={user.id} className="border-b border-border/20 hover:bg-secondary/10">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium text-foreground">{user.full_name || user.email?.split('@')[0] || 'N/A'}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{user.country || 'Unknown'}</span>
                                  <Badge variant="outline" className="text-xs">{user.country_code || 'XX'}</Badge>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="font-mono text-success">${Number(userWallet?.balance || 0).toFixed(2)}</span>
                              </td>
                              <td className="p-3">
                                <Select 
                                  defaultValue={user.pricing_override || 'none'}
                                  onValueChange={(value) => updateUserPricingOverride(user.user_id, value)}
                                >
                                  <SelectTrigger className="w-28 h-7 text-xs bg-secondary/30">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Regional</SelectItem>
                                    <SelectItem value="provider">Provider</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-3">
                                <span className="text-sm text-muted-foreground">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => setSelectedUser(user)}
                                      >
                                        <Wallet className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Adjust Balance: {user.email}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="flex gap-2">
                                          <Button 
                                            variant={adjustmentType === "add" ? "default" : "outline"}
                                            onClick={() => setAdjustmentType("add")}
                                          >
                                            Add
                                          </Button>
                                          <Button 
                                            variant={adjustmentType === "deduct" ? "destructive" : "outline"}
                                            onClick={() => setAdjustmentType("deduct")}
                                          >
                                            Deduct
                                          </Button>
                                        </div>
                                        <Input
                                          type="number"
                                          placeholder="Amount"
                                          value={balanceAdjustment}
                                          onChange={(e) => setBalanceAdjustment(e.target.value)}
                                        />
                                      </div>
                                      <DialogFooter>
                                        <Button onClick={adjustUserBalance}>Apply</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <CardTitle className="text-lg font-display">Deposit Management</CardTitle>
                <CardDescription>Approve or reject pending deposits</CardDescription>
              </CardHeader>
              <CardContent>
                {deposits.filter(d => d.status === 'pending').length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No pending deposits</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deposits.filter(d => d.status === 'pending').map((deposit) => (
                      <div key={deposit.id} className="p-4 rounded-lg bg-secondary/10 border border-border/30 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-lg text-primary">${Number(deposit.amount).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{deposit.payment_method} • {new Date(deposit.created_at).toLocaleString()}</p>
                          {deposit.reference_id && <p className="text-xs text-muted-foreground">Ref: {deposit.reference_id}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => rejectDeposit(deposit.id)}>Reject</Button>
                          <Button size="sm" onClick={() => approveDeposit(deposit)}>Approve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <CardTitle className="text-lg font-display">Support Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No tickets</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="p-4 rounded-lg bg-secondary/10 border border-border/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm text-primary">{ticket.ticket_number}</span>
                              <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>{ticket.status}</Badge>
                              {ticket.priority === 'high' && <Badge variant="destructive">High</Badge>}
                            </div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground mt-1">{ticket.message?.substring(0, 100)}...</p>
                          </div>
                          <div className="flex gap-2">
                            {ticket.status !== 'closed' && (
                              <Button variant="outline" size="sm" onClick={() => closeTicket(ticket.id)}>Close</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
                            <td className="p-3 font-mono text-sm">{order.order_number}</td>
                            <td className="p-3">
                              <p className="text-sm truncate max-w-[200px]">{order.link}</p>
                            </td>
                            <td className="p-3">{order.quantity.toLocaleString()}</td>
                            <td className="p-3 font-mono">${Number(order.price).toFixed(2)}</td>
                            <td className="p-3">
                              <Badge variant={order.status === 'completed' ? 'success' : 'secondary'}>
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

          <TabsContent value="pricing">
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <CardTitle className="text-lg font-display">Regional Pricing Multipliers</CardTitle>
                <CardDescription>
                  Configure pricing multipliers for different regions. Base price × multiplier = final price.
                  This is hidden from users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {regionalPricing.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No regional pricing configured</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regionalPricing.map((region) => {
                      // Calculate user count for this region
                      const regionUserCount = region.countries?.reduce((count: number, code: string) => {
                        return count + (userCountByRegion[code] || 0);
                      }, 0) || 0;

                      return (
                        <Card key={region.id} className="border-border/30 hover:border-primary/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-medium text-foreground">{region.region_name}</p>
                                <p className="text-xs text-muted-foreground">{region.region_code}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="font-mono">{region.multiplier}x</Badge>
                                <p className="text-xs text-muted-foreground mt-1">{regionUserCount} users</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.05"
                                min="0.5"
                                max="5"
                                defaultValue={region.multiplier}
                                className="bg-secondary/30 border-border/30 text-sm"
                                onBlur={(e) => {
                                  const newValue = parseFloat(e.target.value);
                                  if (newValue !== region.multiplier) {
                                    updateRegionalPricing(region.id, newValue);
                                  }
                                }}
                              />
                              <Button variant="outline" size="icon" className="h-9 w-9">
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1">
                              {region.countries?.slice(0, 6).map((code: string) => (
                                <Badge key={code} variant="secondary" className="text-xs">
                                  {code}
                                </Badge>
                              ))}
                              {region.countries?.length > 6 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{region.countries.length - 6}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
