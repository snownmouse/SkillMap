import { Router } from 'express';
import { careerController } from '../controllers/careerController';

export const careerRouter = Router();

careerRouter.post('/plan', careerController.plan);
