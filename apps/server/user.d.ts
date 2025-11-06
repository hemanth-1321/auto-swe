import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: { username: string; [key: string]: any };
    }
  }
}
