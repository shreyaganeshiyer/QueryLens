import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getOverview,
  getTrends,
  getSlowQueries,
} from "../controller/analytics.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", getOverview);
router.get("/trends", getTrends);
router.get("/slow-queries", getSlowQueries);

export default router;