import { Router } from "express";
import { db, purchaseOrdersTable, suppliersTable, profilesTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { eq, and, ilike, desc, sql, or } from "drizzle-orm";

const router = Router();

function generatePoNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `PO-${year}-${rand}`;
}

// GET /purchase-orders
router.get("/purchase-orders", requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query as {
      status?: string;
      search?: string;
    };
    const user = req.user!;

    const conditions = [];

    if (user.role !== "admin") {
      conditions.push(eq(purchaseOrdersTable.clientId, user.id));
    }

    if (status && status !== "all") {
      conditions.push(eq(purchaseOrdersTable.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(purchaseOrdersTable.title, `%${search}%`),
          ilike(purchaseOrdersTable.poNumber, `%${search}%`),
        ),
      );
    }

    const orders = await db
      .select({
        id: purchaseOrdersTable.id,
        poNumber: purchaseOrdersTable.poNumber,
        title: purchaseOrdersTable.title,
        description: purchaseOrdersTable.description,
        status: purchaseOrdersTable.status,
        clientId: purchaseOrdersTable.clientId,
        clientName: profilesTable.fullName,
        clientEmail: profilesTable.email,
        totalAmount: purchaseOrdersTable.totalAmount,
        currency: purchaseOrdersTable.currency,
        createdAt: purchaseOrdersTable.createdAt,
        updatedAt: purchaseOrdersTable.updatedAt,
        supplierCount: sql<number>`COUNT(${suppliersTable.id})::int`,
      })
      .from(purchaseOrdersTable)
      .leftJoin(profilesTable, eq(purchaseOrdersTable.clientId, profilesTable.id))
      .leftJoin(
        suppliersTable,
        eq(suppliersTable.purchaseOrderId, purchaseOrdersTable.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        purchaseOrdersTable.id,
        profilesTable.fullName,
        profilesTable.email,
      )
      .orderBy(desc(purchaseOrdersTable.createdAt));

    res.json(
      orders.map((o) => ({
        ...o,
        totalAmount: o.totalAmount ? parseFloat(o.totalAmount) : null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list purchase orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /purchase-orders (admin only)
router.post("/purchase-orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, clientId, totalAmount, currency, status } =
      req.body as {
        title: string;
        description?: string;
        clientId: string;
        totalAmount?: number;
        currency?: string;
        status?: string;
      };

    if (!title || !clientId) {
      res.status(400).json({ error: "title and clientId are required" });
      return;
    }

    const poNumber = generatePoNumber();

    const [order] = await db
      .insert(purchaseOrdersTable)
      .values({
        poNumber,
        title,
        description: description ?? null,
        clientId,
        totalAmount: totalAmount !== undefined ? String(totalAmount) : null,
        currency: currency ?? "USD",
        status: status ?? "draft",
      })
      .returning();

    res.status(201).json({
      ...order,
      totalAmount: order.totalAmount ? parseFloat(order.totalAmount) : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      supplierCount: 0,
      clientName: null,
      clientEmail: null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create purchase order");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /purchase-orders/:id
router.get("/purchase-orders/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const user = req.user!;

    const [order] = await db
      .select({
        id: purchaseOrdersTable.id,
        poNumber: purchaseOrdersTable.poNumber,
        title: purchaseOrdersTable.title,
        description: purchaseOrdersTable.description,
        status: purchaseOrdersTable.status,
        clientId: purchaseOrdersTable.clientId,
        clientName: profilesTable.fullName,
        clientEmail: profilesTable.email,
        totalAmount: purchaseOrdersTable.totalAmount,
        currency: purchaseOrdersTable.currency,
        createdAt: purchaseOrdersTable.createdAt,
        updatedAt: purchaseOrdersTable.updatedAt,
      })
      .from(purchaseOrdersTable)
      .leftJoin(profilesTable, eq(purchaseOrdersTable.clientId, profilesTable.id))
      .where(eq(purchaseOrdersTable.id, id));

    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (user.role !== "admin" && order.clientId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const suppliers = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.purchaseOrderId, id))
      .orderBy(desc(suppliersTable.createdAt));

    res.json({
      ...order,
      totalAmount: order.totalAmount ? parseFloat(order.totalAmount) : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      suppliers: suppliers.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get purchase order");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /purchase-orders/:id (admin only)
router.patch(
  "/purchase-orders/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { title, description, clientId, totalAmount, currency, status } =
        req.body as {
          title?: string;
          description?: string;
          clientId?: string;
          totalAmount?: number;
          currency?: string;
          status?: string;
        };

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (title !== undefined) updateData["title"] = title;
      if (description !== undefined) updateData["description"] = description;
      if (clientId !== undefined) updateData["clientId"] = clientId;
      if (totalAmount !== undefined)
        updateData["totalAmount"] = String(totalAmount);
      if (currency !== undefined) updateData["currency"] = currency;
      if (status !== undefined) updateData["status"] = status;

      const [updated] = await db
        .update(purchaseOrdersTable)
        .set(updateData)
        .where(eq(purchaseOrdersTable.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.json({
        ...updated,
        totalAmount: updated.totalAmount
          ? parseFloat(updated.totalAmount)
          : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        supplierCount: 0,
        clientName: null,
        clientEmail: null,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to update purchase order");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /purchase-orders/:id (admin only)
router.delete(
  "/purchase-orders/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      // Cascade delete suppliers first
      await db
        .delete(suppliersTable)
        .where(eq(suppliersTable.purchaseOrderId, id));

      await db
        .delete(purchaseOrdersTable)
        .where(eq(purchaseOrdersTable.id, id));

      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete purchase order");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
