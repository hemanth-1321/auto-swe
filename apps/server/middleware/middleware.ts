import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Middleware to authenticate requests using a JWT token
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract the Authorization header (e.g. "Bearer <token>")
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    // Reject the request if no header is present
    return res.status(401).json({ message: "No token provided" });
  }

  // Split "Bearer <token>" and get the token part
  const token = authHeader.split(" ")[1];
  if (!token) {
    // Reject malformed headers like "Bearer"
    return res.status(401).json({ message: "Malformed token" });
  }

  try {
    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      username: string;
    };

    // Attach decoded user data to the request object
    req.user = decoded;

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    // Reject invalid or expired tokens
    return res.status(401).json({ message: "Invalid token" });
  }
};
