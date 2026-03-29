import { Router } from "express";
import {
    register,
    login,
    refresh,
    logout,
    me,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);

// protected route
router.get("/me", protect, me);

export default router;