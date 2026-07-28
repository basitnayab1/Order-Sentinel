import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListPurchaseOrders } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PlusCircle, PackageOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useListPurchaseOrders({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-2">Manage and track all procurement activities.</p>
        </div>
        {isAdmin && (
          <Button asChild className="hover-elevate shadow-sm shrink-0">
            <Link href="/orders/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Order
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or PO number..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40 border-b border-border/50">
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">PO Number</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Title</TableHead>
              {isAdmin && <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Client</TableHead>}
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-center">Suppliers</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Amount</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Date</TableHead>
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
                  <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <PackageOpen className="h-10 w-10 mb-4 opacity-50" />
                    <p className="font-medium text-foreground">No purchase orders found</p>
                    <p className="text-sm mt-1">Adjust your filters or create a new order.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-secondary/40 transition-colors" onClick={() => setLocation(`/orders/${order.id}`)}>
                  <TableCell className="font-medium font-mono text-sm text-primary">{order.poNumber}</TableCell>
                  <TableCell className="font-medium">{order.title}</TableCell>
                  {isAdmin && <TableCell className="text-muted-foreground text-sm">{order.clientName || order.clientEmail || "Unknown"}</TableCell>}
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-secondary text-xs font-medium">
                      {order.supplierCount}
                    </span>
                  </TableCell>
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
    </div>
  );
}
