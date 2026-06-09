import jwt from 'jsonwebtoken'
import { prisma } from '../config/db.js'

export const protect = async (req, res, next) => {
  try {
    const token =
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null) || req.cookies?.accessToken

    if (!token) return res.status(401).json({ error: 'Not authenticated. Please log in.' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true, avatar: true }
    })

    if (!user) return res.status(401).json({ error: 'User no longer exists.' })

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' })
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` })
  next()
}
