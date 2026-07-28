import { Router } from "express";
import { db, suppliersTable, purchaseOrdersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /purchase-orders/:orderId/suppliers
router.get(
  "/purchase-orders/:orderId/suppliers",
  requireAuth,
  async (req, res) => {
    try {
      const { orderId } = req.params as { orderId: string };
      const user = req.user!;

      // Verify access to order
      const [order] = await db
        .select()
        .from(purchaseOrdersTable)
        .where(eq(purchaseOrdersTable.id, orderId));

      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      if (user.role !== "admin" && order.clientId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const suppliers = await db
        .select()
        .from(suppliersTable)
        .where(eq(suppliersTable.purchaseOrderId, orderId))
        .orderBy(desc(suppliersTable.createdAt));

      res.json(
        suppliers.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      );
    } catch (err) {
      req.log.error({ err }, "Failed to list suppliers");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /purchase-orders/:orderId/suppliers (admin only)
router.post(
  "/purchase-orders/:orderId/suppliers",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { orderId } = req.params as { orderId: string };
      const { name, trackingNumber, trackingUrl, status, notes, estimatedDelivery } =
        req.body as {
          name: string;
          trackingNumber?: string;
          trackingUrl?: string;
          status?: string;
          notes?: string;
          estimatedDelivery?: string;
        };

      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }

      const [order] = await db
        .select({ id: purchaseOrdersTable.id })
        .from(purchaseOrdersTable)
        .where(eq(purchaseOrdersTable.id, orderId));

      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const [supplier] = await db
        .insert(suppliersTable)
        .values({
          purchaseOrderId: orderId,
          name,
          trackingNumber: trackingNumber ?? null,
          trackingUrl: trackingUrl ?? null,
          status: status ?? "pending",
          notes: notes ?? null,
          estimatedDelivery: estimatedDelivery ?? null,
        })
        .returning();

      res.status(201).json({
        ...supplier,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      });
    } catch (err) {
      req.log.error({ err }, "Failed to add supplier");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// PATCH /suppliers/:id (admin only)
router.patch("/suppliers/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, trackingNumber, trackingUrl, status, notes, estimatedDelivery } =
      req.body as {
        name?: string;
        trackingNumber?: string;
        trackingUrl?: string;
        status?: string;
        notes?: string;
        estimatedDelivery?: string;
      };

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData["name"] = name;
    if (trackingNumber !== undefined) updateData["trackingNumber"] = trackingNumber;
    if (trackingUrl !== undefined) updateData["trackingUrl"] = trackingUrl;
    if (status !== undefined) updateData["status"] = status;
    if (notes !== undefined) updateData["notes"] = notes;
    if (estimatedDelivery !== undefined) updateData["estimatedDelivery"] = estimatedDelivery;

    const [updated] = await db
      .update(suppliersTable)
      .set(updateData)
      .where(eq(suppliersTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update supplier");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /suppliers/:id (admin only)
router.delete("/suppliers/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete supplier");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
