import express from "express";
import authController, { authValidation } from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth";

const router = express.Router();
router.post("/auth/login", authValidation.login, authController.login); // address
router.post("/auth/register", authValidation.register, authController.register); //  address, name, avatar
router.get("/auth/users", authController.users);

export default router;
