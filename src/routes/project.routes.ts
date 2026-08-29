import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, projectController.findAll.bind(projectController));
router.get('/search', authenticate, projectController.search.bind(projectController));
router.get('/:id', authenticate, projectController.findById.bind(projectController));
router.post('/', authenticate, projectController.create.bind(projectController));
router.put('/:id', authenticate, projectController.update.bind(projectController));
router.delete('/:id', authenticate, projectController.delete.bind(projectController));

export default router;
