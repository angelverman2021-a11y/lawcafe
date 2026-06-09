import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../config/db.js'

// ── Token helpers ─────────────────────────────────────────

const signAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  })

const signRefreshToken = () => crypto.randomBytes(64).toString('hex')

const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
}

const sanitizeUser = (u) => ({
  id:            u.id,
  name:          u.name,
  email:         u.email,
  role:          u.role,
  avatar:        u.avatar,
  bio:           u.bio,
  createdAt:     u.createdAt,
  lawyerProfile: u.lawyerProfile ?? null
})

// ── POST /api/auth/register ───────────────────────────────

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ error: 'Email already registered.' })

    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name, email,
        password: hash,
        role: role === 'LAWYER' ? 'LAWYER' : 'USER'
      },
      include: { lawyerProfile: true }
    })

    const accessToken  = signAccessToken(user.id, user.role)
    const refreshToken = signRefreshToken()
    await saveRefreshToken(user.id, refreshToken)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })

    res.status(201).json({ accessToken, user: sanitizeUser(user) })
  } catch (err) { next(err) }
}

// ── POST /api/auth/login ──────────────────────────────────

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: { lawyerProfile: true }
    })

    if (!user || !user.password || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid email or password.' })

    if (!user.isActive)
      return res.status(403).json({ error: 'Account suspended. Contact support.' })

    const accessToken  = signAccessToken(user.id, user.role)
    const refreshToken = signRefreshToken()
    await saveRefreshToken(user.id, refreshToken)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })

    res.json({ accessToken, user: sanitizeUser(user) })
  } catch (err) { next(err) }
}

// ── POST /api/auth/refresh ────────────────────────────────

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ error: 'No refresh token.' })

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { lawyerProfile: true } } }
    })

    if (!stored)           return res.status(401).json({ error: 'Invalid refresh token.' })
    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token } })
      return res.status(401).json({ error: 'Refresh token expired. Please log in again.' })
    }

    // rotate — delete old, issue new
    await prisma.refreshToken.delete({ where: { token } })
    const newRefreshToken = signRefreshToken()
    await saveRefreshToken(stored.userId, newRefreshToken)

    const accessToken = signAccessToken(stored.userId, stored.user.role)

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })

    res.json({ accessToken, user: sanitizeUser(stored.user) })
  } catch (err) { next(err) }
}

// ── POST /api/auth/logout ─────────────────────────────────

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } })
    }
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully.' })
  } catch (err) { next(err) }
}

// ── GET /api/auth/me ──────────────────────────────────────

export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { lawyerProfile: true }
    })
    if (!user) return res.status(404).json({ error: 'User not found.' })
    res.json({ user: sanitizeUser(user) })
  } catch (err) { next(err) }
}

// ── GET /api/auth/google/callback ────────────────────────
// Called by passport after Google OAuth success

export const googleCallback = async (req, res, next) => {
  try {
    const user = req.user  // set by passport
    if (!user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`)

    const accessToken  = signAccessToken(user.id, user.role)
    const refreshToken = signRefreshToken()
    await saveRefreshToken(user.id, refreshToken)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000
    })

    // redirect to frontend with access token in query (frontend stores it in memory)
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`)
  } catch (err) { next(err) }
}
