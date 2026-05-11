import express from 'express';
import { assessmentController } from '../controllers/assessmentController';

const router = express.Router();

router.get('/questions', assessmentController.getQuestions);
router.post('/submit', assessmentController.submitAnswers);
router.get('/dimensions', assessmentController.getDimensions);
router.get('/paths', assessmentController.getCareerPaths);

export default router;