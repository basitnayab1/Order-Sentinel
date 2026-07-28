import { createClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "client";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user || !user.email) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const role = ((user.app_metadata?.["role"] as string) || "client") as
      | "admin"
      | "client";

    req.user = {
      id: user.id,
      email: user.email,
      role,
    };

    // Upsert profile so join queries always have client data
    await db
      .insert(profilesTable)
      .values({
        id: user.id,
        email: user.email,
        fullName: (user.user_metadata?.["full_name"] as string | undefined) ?? null,
        role,
      })
      .onConflictDoUpdate({
        target: profilesTable.id,
        set: {
          email: user.email,
          role,
          updatedAt: new Date(),
        },
      });

    next();
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }
  next();
}
