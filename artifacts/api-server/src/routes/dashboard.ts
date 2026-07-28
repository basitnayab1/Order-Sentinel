import { Router } from "express";
import { db, purchaseOrdersTable, suppliersTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

// GET /dashboard/summary
router.get("/dashboard/summary", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const isAdmin = user.role === "admin";

    // Order status counts
    const orderCondition = isAdmin
      ? undefined
      : eq(purchaseOrdersTable.clientId, user.id);

    const statusCounts = await db
      .select({
        status: purchaseOrdersTable.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(purchaseOrdersTable)
      .where(orderCondition)
      .groupBy(purchaseOrdersTable.status);

    const countsByStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      countsByStatus[row.status] = row.count;
    }

    const totalOrders = Object.values(countsByStatus).reduce((a, b) => a + b, 0);
    const activeOrders = countsByStatus["active"] ?? 0;
    const completedOrders = countsByStatus["completed"] ?? 0;
    const draftOrders = countsByStatus["draft"] ?? 0;
    const cancelledOrders = countsByStatus["cancelled"] ?? 0;

    // Supplier status counts (scoped to user's orders)
    const supplierQuery = db
      .select({
        status: suppliersTable.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(suppliersTable)
      .groupBy(suppliersTable.status);

    let supplierStatusCounts: Array<{ status: string; count: number }>;

    if (isAdmin) {
      supplierStatusCounts = await supplierQuery;
    } else {
      supplierStatusCounts = await db
        .select({
          status: suppliersTable.status,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(suppliersTable)
        .innerJoin(
          purchaseOrdersTable,
          and(
            eq(suppliersTable.purchaseOrderId, purchaseOrdersTable.id),
            eq(purchaseOrdersTable.clientId, user.id),
          ),
        )
        .groupBy(suppliersTable.status);
    }

    const supplierCounts: Record<string, number> = {};
    let totalSuppliers = 0;
    for (const row of supplierStatusCounts) {
      supplierCounts[row.status] = row.count;
      totalSuppliers += row.count;
    }

    // Unread notifications
    const [unreadResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.recipientId, user.id),
          eq(notificationsTable.isRead, false),
        ),
      );

    const unreadNotifications = unreadResult?.count ?? 0;

    // Recent orders (last 5)
    const recentOrders = await db
      .select({
        id: purchaseOrdersTable.id,
        poNumber: purchaseOrdersTable.poNumber,
        title: purchaseOrdersTable.title,
        description: purchaseOrdersTable.description,
        status: purchaseOrdersTable.status,
        clientId: purchaseOrdersTable.clientId,
        clientName: sql<string | null>`NULL`,
        clientEmail: sql<string | null>`NULL`,
        totalAmount: purchaseOrdersTable.totalAmount,
        currency: purchaseOrdersTable.currency,
        supplierCount: sql<number>`0::int`,
        createdAt: purchaseOrdersTable.createdAt,
        updatedAt: purchaseOrdersTable.updatedAt,
      })
      .from(purchaseOrdersTable)
      .where(orderCondition)
      .orderBy(desc(purchaseOrdersTable.createdAt))
      .limit(5);

    res.json({
      totalOrders,
      activeOrders,
      completedOrders,
      draftOrders,
      cancelledOrders,
      totalSuppliers,
      suppliersByStatus: {
        pending: supplierCounts["pending"] ?? 0,
        processing: supplierCounts["processing"] ?? 0,
        shipped: supplierCounts["shipped"] ?? 0,
        delivered: supplierCounts["delivered"] ?? 0,
      },
      unreadNotifications,
      recentOrders: recentOrders.map((o) => ({
        ...o,
        totalAmount: o.totalAmount ? parseFloat(o.totalAmount) : null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
