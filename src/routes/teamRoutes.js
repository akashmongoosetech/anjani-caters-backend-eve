import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';
import { getTeam, createTeamMember, updateTeamMember, deleteTeamMember } from '../controllers/teamController.js';

const router = Router();

router.get('/', getTeam);
router.post('/', protect, authorize('super_admin', 'admin', 'manager'), createTeamMember);
router.put('/:id', protect, authorize('super_admin', 'admin', 'manager'), updateTeamMember);
router.delete('/:id', protect, authorize('super_admin', 'admin', 'manager'), deleteTeamMember);

export default router;
