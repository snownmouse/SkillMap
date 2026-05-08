import { Router } from 'express';
import { authController, requireAuth, optionalAuth } from '../controllers/authController';

export const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refreshToken);
authRouter.get('/me', authController.me);
authRouter.get('/whoami', optionalAuth, authController.whoami);
authRouter.post('/logout', authController.logout);
authRouter.post('/convert-temp', requireAuth, authController.convertTempUser);
authRouter.post('/update-password', requireAuth, authController.updatePassword);
