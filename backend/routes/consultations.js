import { Router } from 'express'
import { body } from 'express-validator'
import { createConsultation, getMyConsultations, getLawyerConsultations, confirmPayment, getPrivateRoom } from '../controllers/consultationsController.js'
import { protect, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.use(protect)

router.get('/my',     getMyConsultations)
router.get('/lawyer', requireRole('LAWYER'), getLawyerConsultations)

router.post('/',
  [ body('lawyerId').notEmpty(), body('title').trim().notEmpty(),
    body('scheduledAt').notEmpty(), body('duration').isInt({ min: 15 }) ],
  validate,
  createConsultation
)

router.post('/:id/confirm-payment', confirmPayment)
router.get('/:id/room',             getPrivateRoom)

export default router
