import { useAuth } from "@/lib/authContext";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useSendNotification,
  useListClients,
  useListPurchaseOrders,
  getListNotificationsQueryKey,
  getListClientsQueryKey,
  getListPurchaseOrdersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Link } from "wouter";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Send, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";

const sendNotificationSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  orderId: z.string().optional().or(z.literal('')),
});

export default function NotificationsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const { data: notifications, isLoading: loadingNotifications } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Admin only hooks
  const { data: clients, isLoading: loadingClients } = useListClients({ query: { enabled: isAdmin, queryKey: getListClientsQueryKey() } });
  const { data: orders, isLoading: loadingOrders } = useListPurchaseOrders(undefined, { query: { enabled: isAdmin, queryKey: getListPurchaseOrdersQueryKey() } });
  const sendNotification = useSendNotification();

  const handleMarkRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await markRead.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch (err: any) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      toast.success("All notifications marked as read");
    } catch (err: any) {
      toast.error("Failed to mark all as read");
    }
  };

  const form = useForm<z.infer<typeof sendNotificationSchema>>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      recipientId: "",
      title: "",
      message: "",
      orderId: "",
    },
  });

  const onSendSubmit = async (values: z.infer<typeof sendNotificationSchema>) => {
    setIsSending(true);
    try {
      const payload = { ...values };
      if (payload.orderId === "none") {
        delete payload.orderId;
      }
      await sendNotification.mutateAsync({ data: payload });
      toast.success("Notification sent successfully");
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">Updates on your purchase orders and activities.</p>
      </div>

      <div className={`grid gap-8 ${isAdmin ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        
        {/* Inbox Section */}
        <div className={`space-y-4 ${isAdmin ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Inbox
            </h2>
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending || !notifications?.some(n => !n.isRead)}>
              <Check className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          </div>

          <div className="space-y-3">
            {loadingNotifications ? (
              Array(4).fill(0).map((_, i) => (
                <Card key={i} className="shadow-sm border-border/50"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))
            ) : notifications?.length === 0 ? (
              <Card className="shadow-sm border-dashed bg-secondary/20">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p>You have no notifications.</p>
                </CardContent>
              </Card>
            ) : (
              notifications?.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`shadow-sm border-border/50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-primary/5 border-primary/20' : 'hover:bg-secondary/20'}`}
                  onClick={() => handleMarkRead(notification.id, notification.isRead)}
                >
                  <CardContent className="p-4 flex gap-4">
                    <div className="mt-1">
                      {notification.isRead ? <CheckCircle2 className="h-5 w-5 text-muted-foreground opacity-50" /> : <Circle className="h-5 w-5 text-primary fill-primary/20" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-medium ${!notification.isRead ? 'text-foreground' : 'text-foreground/80'}`}>{notification.title}</h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className={`text-sm ${!notification.isRead ? 'text-foreground/90' : 'text-muted-foreground'}`}>{notification.message}</p>
                      {notification.orderId && (
                        <div className="pt-2">
                          <Button variant="link" size="sm" className="h-auto p-0" asChild>
                            <Link href={`/orders/${notification.orderId}`}>
                              View Order {notification.orderPoNumber && `(${notification.orderPoNumber})`}
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Admin Send Notification Form */}
        {isAdmin && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Send Alert
            </h2>
            <Card className="shadow-sm border-border/50 bg-secondary/10">
              <CardHeader>
                <CardTitle className="text-lg">New Notification</CardTitle>
                <CardDescription>Manually alert a client.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSendSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recipientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background"><SelectValue placeholder="Select client" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingClients ? (
                                <div className="p-2 text-sm text-center">Loading...</div>
                              ) : (
                                clients?.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>{client.name || client.email}</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="e.g. Shipment Delayed" className="bg-background" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Textarea placeholder="Details..." className="bg-background resize-none" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Order (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="bg-background"><SelectValue placeholder="Select order" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none" className="text-muted-foreground">None</SelectItem>
                              {loadingOrders ? (
                                <div className="p-2 text-sm text-center">Loading...</div>
                              ) : (
                                orders?.map((order) => (
                                  <SelectItem key={order.id} value={order.id}>{order.poNumber} - {order.title}</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full mt-2 hover-elevate shadow-sm" disabled={isSending}>
                      {isSending ? "Sending..." : "Send Notification"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
