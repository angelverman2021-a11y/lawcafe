import { prisma } from '../config/db.js'

// GET /api/chat/:room/messages
export const getMessages = async (req, res, next) => {
  try {
    const { room } = req.params
    const { cursor, limit = 50 } = req.query

    const messages = await prisma.message.findMany({
      where: { room },
      orderBy: { createdAt: 'asc' },
      take: Number(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } }
      }
    })
    res.json({ count: messages.length, messages })
  } catch (err) { next(err) }
}

// POST /api/chat/:room/messages  (protected)
export const postMessage = async (req, res, next) => {
  try {
    const { room } = req.params
    const { text } = req.body

    const message = await prisma.message.create({
      data: { room, text, userId: req.user.id },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } }
      }
    })
    res.status(201).json({ message })
  } catch (err) { next(err) }
}

// DELETE /api/chat/messages/:id  (own message or admin)
export const deleteMessage = async (req, res, next) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } })
    if (!msg) return res.status(404).json({ error: 'Message not found.' })
    if (msg.userId !== req.user.id && req.user.role !== 'ADMIN')
      return res.status(403).json({ error: 'Not allowed.' })

    await prisma.message.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) { next(err) }
}
