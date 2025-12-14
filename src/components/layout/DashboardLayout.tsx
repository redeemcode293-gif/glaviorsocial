import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  Wallet,
  RefreshCw,
  Code2,
  Users,
  Megaphone,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "New Order", href: "/new-order" },
  { icon: Package, label: "Orders", href: "/orders" },
  { icon: RefreshCw, label: "Refills", href: "/refills" },
  { icon: Wallet, label: "Add Funds", href: "/add-funds" },
  { icon: Users, label: "Refer & Earn", href: "/referrals", badge: "NEW" },
  { icon: Code2, label: "API", href: "/api-docs", badge: "PRO" },
  { icon: Megaphone, label: "Updates", href: "/updates" },
  { icon: HelpCircle, label: "Support", href: "/support" },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance] = useState(125.50);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64 
        border-r border-border/30 bg-sidebar flex flex-col
        transform transition-transform duration-300 lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-border/30">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="font-display text-xs font-bold text-primary-foreground">GS</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-wider text-foreground">GLAVIOR</span>
              <span className="text-[8px] font-semibold text-primary tracking-[0.2em]">SOCIAL</span>
            </div>
          </Link>
        </div>

        {/* Balance Card */}
        <div className="p-4">
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Balance</p>
            <p className="font-display text-xl font-bold text-primary">${balance.toFixed(2)}</p>
            <Button 
              size="sm" 
              className="w-full mt-2 h-7 text-xs"
              onClick={() => navigate("/add-funds")}
            >
              <Wallet className="h-3 w-3 mr-1" />
              Add Funds
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-0.5 py-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] px-1.5 py-0 ${
                      item.badge === "NEW" 
                        ? "border-success/50 text-success" 
                        : "border-primary/50 text-primary"
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="p-3 border-t border-border/30">
          <Link 
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/30 bg-background/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 lg:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
              </Button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border/30">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  JD
                </div>
                <span className="text-sm font-medium">John Doe</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};