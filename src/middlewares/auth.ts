import jwt from "jsonwebtoken";
import environment from "../config";

const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    req.user = jwt.verify(token, environment.secretKey);
    next();
  } catch (e: any) {
    res.status(401).json({ msg: "Token is not valid " });
  }
};
export default authMiddleware;
