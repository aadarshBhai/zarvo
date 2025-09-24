import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User";
dotenv.config();

interface JwtPayload {
  id: string;
}

export const protect = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "No token, authorization denied" });
  }
};

export const isAdmin = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role === 'admin' || role === 'super-admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
};

export const isSuperAdmin = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role === 'super-admin') return next();
  return res.status(403).json({ message: 'Super-admin access required' });
};
