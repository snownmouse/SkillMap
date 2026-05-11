import { Router } from 'express';
import { careerPlanController } from '../controllers/careerPlanController';

const router = Router();

router.post('/analyze', careerPlanController.analyze);

export default router;