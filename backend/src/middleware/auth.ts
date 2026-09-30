import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../generated/prisma/enums";

export type AuthRequest = Request & { user?: { id: string; role: UserRole; username: string } };
const secret = process.env.JWT_SECRET || "development-secret";

export function signToken(user: { id: string; role: UserRole; username: string }) {
  return jwt.sign(user, secret, { expiresIn: "12h" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    req.user = jwt.verify(token, secret) as AuthRequest["user"];
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: "Insufficient permissions" });
    next();
  };
}
