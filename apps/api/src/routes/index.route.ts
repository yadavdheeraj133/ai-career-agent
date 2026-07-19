import { Router} from 'express';
import { healthCheck } from '../controllers/index.controller.js';
import { errorHandler } from '../middlewares/error.middleware.js';

const router: Router = Router();

router.get('/', healthCheck);


router.use(errorHandler);

export default router;