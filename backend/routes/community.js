import { Router } from 'express'
import { body } from 'express-validator'
import { getPosts, createPost, likePost, addComment } from '../controllers/communityController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.get('/posts', getPosts)

router.post('/posts',
  protect,
  [ body('content').trim().notEmpty().isLength({ max: 5000 }) ],
  validate,
  createPost
)

router.post('/posts/:id/like',    protect, likePost)

router.post('/posts/:id/comments',
  protect,
  [ body('text').trim().notEmpty() ],
  validate,
  addComment
)

export default router
