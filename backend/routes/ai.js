import { Router } from 'express'
import { body } from 'express-validator'
import { chat, getHistory, getMySessions } from '../controllers/aiController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.post('/chat',
  [
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 2000 }),
    body('sessionId').notEmpty().withMessage('sessionId is required')
  ],
  validate,
  chat
)

router.get('/history/:sessionId', getHistory)
router.get('/sessions', protect, getMySessions)

export default router
