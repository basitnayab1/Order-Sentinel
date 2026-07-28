import { Router } from "express";
import { db, notificationsTable, profilesTable, purchaseOrdersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const { unread } = req.query as { unread?: string };
    const user = req.user!;

    const conditions = [eq(notificationsTable.recipientId, user.id)];
    if (unread === "true") {
      conditions.push(eq(notificationsTable.isRead, false));
    }

    const rows = await db
      .select({
        id: notificationsTable.id,
        recipientId: notificationsTable.recipientId,
        senderId: notificationsTable.senderId,
        senderName: profilesTable.fullName,
        title: notificationsTable.title,
        message: notificationsTable.message,
        orderId: notificationsTable.orderId,
        orderPoNumber: purchaseOrdersTable.poNumber,
        isRead: notificationsTable.isRead,
        createdAt: notificationsTable.createdAt,
      })
      .from(notificationsTable)
      .leftJoin(
        profilesTable,
        eq(notificationsTable.senderId, profilesTable.id),
      )
      .leftJoin(
        purchaseOrdersTable,
        eq(notificationsTable.orderId, purchaseOrdersTable.id),
      )
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.createdAt));

    res.json(
      rows.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /notifications (admin only)
router.post("/notifications", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { recipientId, title, message, orderId } = req.body as {
      recipientId: string;
      title: string;
      message: string;
      orderId?: string;
    };

    if (!recipientId || !title || !message) {
      res
        .status(400)
        .json({ error: "recipientId, title, and message are required" });
      return;
    }

    const [notification] = await db
      .insert(notificationsTable)
      .values({
        recipientId,
        senderId: req.user!.id,
        title,
        message,
        orderId: orderId ?? null,
        isRead: false,
      })
      .returning();

    res.status(201).json({
      ...notification,
      senderName: null,
      orderPoNumber: null,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send notification");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /notifications/read-all
router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.recipientId, req.user!.id),
          eq(notificationsTable.isRead, false),
        ),
      );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    req.log.error({ err }, "Failed to mark all notifications as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.recipientId, req.user!.id),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      ...updated,
      senderName: null,
      orderPoNumber: null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
