import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { rateDoctor, getDoctorRating } from "../controllers/ratingController";

const router = Router();

router.post("/", protect as any, rateDoctor as any);
router.get("/:doctorId", protect as any, getDoctorRating as any);

export default router;
