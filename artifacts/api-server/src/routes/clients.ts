import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { eq } from "drizzle-orm";

const router = Router();

// GET /clients (admin only — list all client users)
router.get("/clients", requireAuth, requireAdmin, async (req, res) => {
  try {
    const clients = await db
      .select({
        id: profilesTable.id,
        email: profilesTable.email,
        name: profilesTable.fullName,
      })
      .from(profilesTable)
      .where(eq(profilesTable.role, "client"))
      .orderBy(profilesTable.email);

    res.json(clients);
  } catch (err) {
    req.log.error({ err }, "Failed to list clients");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
