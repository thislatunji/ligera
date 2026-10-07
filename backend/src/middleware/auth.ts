import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin, createAuthClient } from "../config/supabase.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
  supabaseUserClient?: ReturnType<typeof createAuthClient>;
}

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing or invalid authorization header." });
      return;
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      res.status(401).json({ error: "Unauthorized: No token provided." });
      return;
    }

    const userClient = createAuthClient(token);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    let userId = claimsData?.claims?.sub;

    if (!userId) {
      // Fallback: try getUser with token
      const { data: userData, error: userError } = await userClient.auth.getUser(token);
      if (userError || !userData.user) {
        res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
        return;
      }
      userId = userData.user.id;
      req.user = { id: userData.user.id, email: userData.user.email };
    } else {
      req.user = { id: userId, email: (claimsData?.claims as any)?.email };
    }

    // Verify admin role via Supabase RPC has_role
    const { data: hasRole, error: roleError } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (roleError) {
      console.error("[Auth] Error verifying admin role:", roleError);
      res.status(500).json({ error: "Failed to verify admin privileges." });
      return;
    }

    if (hasRole !== true) {
      res.status(403).json({ error: "Forbidden: Admin access required." });
      return;
    }

    req.supabaseUserClient = userClient;
    next();
  } catch (err: any) {
    console.error("[Auth Middleware Error]:", err);
    res.status(500).json({ error: err.message || "Internal server error during authentication." });
  }
};
