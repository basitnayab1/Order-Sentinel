import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import {
  useGetPurchaseOrder,
  useUpdatePurchaseOrder,
  useListOrderSuppliers,
  useAddSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  getListPurchaseOrdersQueryKey,
  getGetPurchaseOrderQueryKey,
  getListOrderSuppliersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Truck,
  PlusCircle,
  FileText,
  Clock,
  User as UserIcon,
  CreditCard,
  Edit2,
  Trash2,
  ExternalLink,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  status: z.enum(["pending", "processing", "shipped", "delivered"]).default("pending"),
  estimatedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

export default function OrderDetailPage({ id }: { id: string }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const { data: order, isLoading: loadingOrder } = useGetPurchaseOrder(id);
  const { data: suppliers, isLoading: loadingSuppliers } = useListOrderSuppliers(id);

  const updateOrder = useUpdatePurchaseOrder();
  const addSupplier = useAddSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  const handleStatusChange = async (newStatus: any) => {
    if (!isAdmin) return;
    try {
      await updateOrder.mutateAsync({ id, data: { status: newStatus } });
      queryClient.setQueryData(getGetPurchaseOrderQueryKey(id), (old: any) => old ? { ...old, status: newStatus } : old);
      queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
      toast.success("Order status updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status");
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-blue-100 text-blue-800 border-none shadow-none text-sm">Active</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-800 border-none shadow-none text-sm">Completed</Badge>;
      case 'draft': return <Badge className="bg-slate-100 text-slate-800 border-none shadow-none text-sm">Draft</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 border-none shadow-none text-sm">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSupplierStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Pending</Badge>;
      case 'processing': return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 shadow-none hover:bg-blue-100">Processing</Badge>;
      case 'shipped': return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 shadow-none hover:bg-amber-100">Shipped</Badge>;
      case 'delivered': return <Badge className="bg-green-50 text-green-700 border border-green-200 shadow-none hover:bg-green-100">Delivered</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const supplierForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      trackingNumber: "",
      trackingUrl: "",
      status: "pending",
      estimatedDelivery: "",
      notes: "",
    },
  });

  const onAddSupplierSubmit = async (values: z.infer<typeof supplierSchema>) => {
    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({ id: editingSupplier.id, data: values });
        toast.success("Supplier updated successfully");
      } else {
        await addSupplier.mutateAsync({ orderId: id, data: values });
        toast.success("Supplier added successfully");
      }
      queryClient.invalidateQueries({ queryKey: getListOrderSuppliersQueryKey(id) });
      setIsAddSupplierOpen(false);
      setEditingSupplier(null);
      supplierForm.reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to save supplier");
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await deleteSupplierMutation.mutateAsync({ id: supplierId });
      queryClient.invalidateQueries({ queryKey: getListOrderSuppliersQueryKey(id) });
      toast.success("Supplier deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete supplier");
    }
  };

  const handleSupplierStatusChange = async (supplierId: string, newStatus: any) => {
    try {
      await updateSupplier.mutateAsync({ id: supplierId, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: getListOrderSuppliersQueryKey(id) });
      toast.success("Supplier status updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const openEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    supplierForm.reset({
      name: supplier.name,
      trackingNumber: supplier.trackingNumber || "",
      trackingUrl: supplier.trackingUrl || "",
      status: supplier.status,
      estimatedDelivery: supplier.estimatedDelivery || "",
      notes: supplier.notes || "",
    });
    setIsAddSupplierOpen(true);
  };

  if (loadingOrder) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Order not found</h2>
        <Button asChild className="mt-4"><Link href="/orders">Back to Orders</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
            <Link href="/orders"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{order.title}</h1>
              {isAdmin ? (
                <Select value={order.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[140px] h-8 text-xs border-none shadow-none bg-transparent hover:bg-secondary/50 p-0 focus:ring-0 font-medium">
                    {getOrderStatusBadge(order.status)}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                getOrderStatusBadge(order.status)
              )}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 font-mono text-sm">
              <FileText className="h-4 w-4" /> {order.poNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-sm leading-relaxed">{order.description || "No description provided."}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <UserIcon className="h-4 w-4" /> Client
                </h4>
                <p className="text-sm font-medium">{order.clientName || order.clientEmail}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" /> Created At
                </h4>
                <p className="text-sm font-medium">{format(new Date(order.createdAt), "MMM d, yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm border-border/50 bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary"><CreditCard className="h-5 w-5" /> Financials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium">{order.currency}</span>
              </div>
              <div className="flex justify-between items-end pt-4">
                <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {order.totalAmount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.totalAmount) : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Suppliers & Shipments
          </h2>
          {isAdmin && (
            <Dialog open={isAddSupplierOpen} onOpenChange={(open) => {
              setIsAddSupplierOpen(open);
              if (!open) {
                setEditingSupplier(null);
                supplierForm.reset({ name: "", trackingNumber: "", trackingUrl: "", status: "pending", estimatedDelivery: "", notes: "" });
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="hover-elevate shadow-sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
                  <DialogDescription>
                    {editingSupplier ? "Update supplier and shipment tracking details." : "Add a new supplier to this purchase order."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...supplierForm}>
                  <form onSubmit={supplierForm.handleSubmit(onAddSupplierSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={supplierForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Name <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="e.g. Acme Corp" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={supplierForm.control}
                        name="trackingNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tracking Number</FormLabel>
                            <FormControl><Input placeholder="1Z99999..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={supplierForm.control}
                        name="estimatedDelivery"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Est. Delivery</FormLabel>
                            <FormControl><Input placeholder="YYYY-MM-DD" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={supplierForm.control}
                      name="trackingUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tracking URL</FormLabel>
                          <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={supplierForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={supplierForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl><Textarea placeholder="Any additional notes..." className="resize-none h-20" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="pt-4">
                      <DialogClose asChild>
                        <Button variant="outline" type="button">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={addSupplier.isPending || updateSupplier.isPending}>
                        {addSupplier.isPending || updateSupplier.isPending ? "Saving..." : "Save Supplier"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40 border-b border-border/50">
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Name</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Tracking</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Est. Delivery</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Notes</TableHead>
                {isAdmin && <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSuppliers ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    {isAdmin && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>}
                  </TableRow>
                ))
              ) : suppliers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-32 text-center text-muted-foreground">
                    No suppliers added to this order yet.
                  </TableCell>
                </TableRow>
              ) : (
                suppliers?.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      {supplier.trackingUrl ? (
                        <a href={supplier.trackingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-mono text-sm">
                          {supplier.trackingNumber || "Track"} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">{supplier.trackingNumber || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select value={supplier.status} onValueChange={(val) => handleSupplierStatusChange(supplier.id, val)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs border-none shadow-none bg-transparent p-0 hover:bg-secondary/50 focus:ring-0">
                            {getSupplierStatusBadge(supplier.status)}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getSupplierStatusBadge(supplier.status)
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{supplier.estimatedDelivery || "-"}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground" title={supplier.notes || ""}>
                      {supplier.notes || "-"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditSupplier(supplier)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteSupplier(supplier.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
