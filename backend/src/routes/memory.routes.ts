import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    createEdge,
    createNode,
    deleteEdge,
    deleteNode,
    getGraph,
    updateNode,
} from "../controllers/memory.controller";

const router = Router();

router.use(protect);

router.get("/graph", getGraph);
router.post("/nodes", createNode);
router.patch("/nodes/:nodeId", updateNode);
router.delete("/nodes/:nodeId", deleteNode);
router.post("/edges", createEdge);
router.delete("/edges/:edgeId", deleteEdge);

export default router;
