import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/authContext";
import { useListNotifications } from "@workspace/api-client-react";
import { LayoutDashboard, ShoppingCart, Bell, PlusCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAdmin, role, signOut } = useAuth();

  const { data: notifications } = useListNotifications({ unread: 'true' });
  const unreadCount = notifications?.length || 0;

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full shrink-0 flex-none relative z-10 shadow-sm">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-primary tracking-tight">ProcureTrack</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href} className={`flex items-center justify-between px-3 py-2.5 rounded-md transition-colors ${location === item.href || (item.name === 'Orders' && location.startsWith('/orders') && location !== '/orders/new') ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </div>
            {item.badge !== undefined && (
              <Badge variant={location === item.href ? "secondary" : "default"} className="px-1.5 min-w-5 justify-center">
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}

        {isAdmin && (
          <Link href="/orders/new" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${location === '/orders/new' ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            <PlusCircle className="h-5 w-5" />
            <span>New Order</span>
          </Link>
        )}
      </div>

      <div className="p-4 border-t bg-card mt-auto space-y-4">
        <div className="flex flex-col gap-1 px-2">
          <span className="text-sm font-medium text-foreground truncate">{user?.email}</span>
          <div className="flex items-center">
            <Badge variant="outline" className="text-xs capitalize px-2 py-0.5 border-primary/20 text-primary bg-primary/5">{role}</Badge>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
