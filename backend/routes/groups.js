import { Router } from 'express'
import { body } from 'express-validator'
import { getGroups, getGroup, createGroup, joinGroup, leaveGroup, lawyerJoinGroup } from '../controllers/groupsController.js'
import { getDiscussions, getDiscussion, createDiscussion, addReply, voteDiscussion } from '../controllers/discussionsController.js'
import { protect, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

// groups
router.get('/',      getGroups)
router.get('/:slug', getGroup)
router.post('/',
  protect,
  [ body('title').trim().notEmpty(), body('description').trim().notEmpty(), body('category').notEmpty() ],
  validate, createGroup
)
router.post('/:slug/join',    protect, joinGroup)
router.delete('/:slug/leave', protect, leaveGroup)
router.post('/:slug/lawyers', protect, requireRole('LAWYER'), lawyerJoinGroup)

// discussions inside a group
router.get('/:slug/discussions',    protect, getDiscussions)
router.get('/:slug/discussions/:id', protect, getDiscussion)
router.post('/:slug/discussions',
  protect,
  [ body('title').trim().notEmpty(), body('content').trim().notEmpty() ],
  validate, createDiscussion
)

export default router
