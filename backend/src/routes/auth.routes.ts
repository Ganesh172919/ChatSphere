import { Router } from "express";
import { register, login } from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// protected route
router.get("/me", protect, (req: any, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});

export default router;