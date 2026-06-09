import { prisma } from '../config/db.js'

// GET /api/users/profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true }
    })
    res.json({ user })
  } catch (err) { next(err) }
}

// PATCH /api/users/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name && { name }), ...(avatar && { avatar }) },
      select: { id: true, name: true, email: true, role: true, avatar: true }
    })
    res.json({ user })
  } catch (err) { next(err) }
}

// GET /api/users  (admin only)
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ count: users.length, users })
  } catch (err) { next(err) }
}
