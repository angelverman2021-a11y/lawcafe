import { Router } from 'express'
import { body } from 'express-validator'
import {
  applyAsLawyer, getLawyers, getLawyer,
  updateLawyerProfile, getPendingLawyers, verifyLawyer
} from '../controllers/lawyersController.js'
import { protect, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.get('/',     getLawyers)
router.get('/admin/pending', protect, requireRole('ADMIN'), getPendingLawyers)
router.get('/:id',  getLawyer)

router.post('/apply',
  protect,
  requireRole('LAWYER'),
  [ body('barNumber').notEmpty(), body('bio').trim().notEmpty(), body('experience').isInt({ min: 0 }) ],
  validate,
  applyAsLawyer
)

router.patch('/profile', protect, requireRole('LAWYER'), updateLawyerProfile)
router.patch('/admin/:id/verify', protect, requireRole('ADMIN'), verifyLawyer)

export default router
