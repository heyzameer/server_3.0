import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { asyncHandler } from "../utils/errorHandler";

interface AuthRequest extends Request {
  user?: any; // you can replace `any` with your IUser interface
}

export const authenticateAdmin = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Get token from headers (Bearer <token>)
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JwtPayload;

      // Check if role is admin
      if (!decoded || decoded.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
      }

      // Attach user info to request
      req.user = decoded;

      next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
);
