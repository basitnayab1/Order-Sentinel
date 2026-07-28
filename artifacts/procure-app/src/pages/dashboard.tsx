import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle2, TrendingUp, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/authContext";

function StatCard({ title, value, icon: Icon, description, isLoading }: any) {
  return (
    <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16 mb-1" />
        ) : (
          <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetDashboardSummary();
  const { isAdmin } = useAuth();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none shadow-none">Active</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none shadow-none">Completed</Badge>;
      case 'draft': return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-none shadow-none">Draft</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none shadow-none">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your procurement activity and metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={data?.totalOrders || 0}
          icon={Package}
          description="All time purchase orders"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Orders"
          value={data?.activeOrders || 0}
          icon={TrendingUp}
          description="Currently processing"
          isLoading={isLoading}
        />
        <StatCard
          title="Delivered Suppliers"
          value={data?.suppliersByStatus?.delivered || 0}
          icon={CheckCircle2}
          description="Out of total suppliers"
          isLoading={isLoading}
        />
        <StatCard
          title="Unread Notifications"
          value={data?.unreadNotifications || 0}
          icon={Bell}
          description="Requires attention"
          isLoading={isLoading}
        />
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <div className="space-y-1">
            <CardTitle>Recent Orders</CardTitle>
            <p className="text-sm text-muted-foreground">The 5 most recent purchase orders.</p>
          </div>
          <Link href="/orders" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead>PO Number</TableHead>
                  <TableHead>Title</TableHead>
                  {isAdmin && <TableHead>Client</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      {isAdmin && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.recentOrders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                      No recent orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.recentOrders?.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-secondary/40 transition-colors" onClick={() => setLocation(`/orders/${order.id}`)}>
                      <TableCell className="font-medium font-mono text-sm">{order.poNumber}</TableCell>
                      <TableCell>{order.title}</TableCell>
                      {isAdmin && <TableCell className="text-muted-foreground">{order.clientName || order.clientEmail || "Unknown"}</TableCell>}
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {order.totalAmount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.totalAmount) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
