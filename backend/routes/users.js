import { Router } from 'express'
import { getProfile, updateProfile, getAllUsers } from '../controllers/usersController.js'
import { protect, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(protect)

router.get('/profile',  getProfile)
router.patch('/profile', updateProfile)
router.get('/', requireRole('ADMIN'), getAllUsers)

export default router
