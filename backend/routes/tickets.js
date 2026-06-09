import { Router } from 'express'
import { body } from 'express-validator'
import { getTickets, createTicket, voteTicket, addReply, updateStatus } from '../controllers/ticketsController.js'
import { protect, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.get('/', getTickets)

router.post('/',
  protect,
  [ body('title').trim().notEmpty(), body('desc').trim().notEmpty(), body('category').notEmpty() ],
  validate,
  createTicket
)

router.post('/:id/vote',   protect, voteTicket)

router.post('/:id/replies',
  protect,
  [ body('text').trim().notEmpty() ],
  validate,
  addReply
)

router.patch('/:id/status', protect, requireRole('ADMIN'), updateStatus)

export default router
