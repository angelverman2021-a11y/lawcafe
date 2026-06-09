import { Router } from 'express'
import { body } from 'express-validator'
import { getMessages, postMessage, deleteMessage } from '../controllers/chatController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.get('/:room/messages', protect, getMessages)

router.post('/:room/messages',
  protect,
  [ body('text').trim().notEmpty().withMessage('Message cannot be empty').isLength({ max: 2000 }) ],
  validate,
  postMessage
)

router.delete('/messages/:id', protect, deleteMessage)

export default router
