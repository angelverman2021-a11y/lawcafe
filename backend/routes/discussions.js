import { Router } from 'express'
import { body } from 'express-validator'
import { addReply, voteDiscussion } from '../controllers/discussionsController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.post('/:id/replies',
  protect,
  [ body('content').trim().notEmpty() ],
  validate, addReply
)
router.post('/:id/vote', protect, voteDiscussion)

export default router
