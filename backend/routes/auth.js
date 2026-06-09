import { Router } from 'express'
import { body } from 'express-validator'
import passport from '../config/passport.js'
import { register, login, refresh, logout, getMe, googleCallback } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

// ── Email / Password ──────────────────────────────────────

router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  register
)

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
)

router.post('/refresh', refresh)
router.post('/logout',  logout)
router.get('/me',       protect, getMe)

// ── Google OAuth ──────────────────────────────────────────

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  googleCallback
)

export default router
