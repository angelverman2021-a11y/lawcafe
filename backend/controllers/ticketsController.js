import { prisma } from '../config/db.js'

// GET /api/tickets
export const getTickets = async (req, res, next) => {
  try {
    const { status, category, sort } = req.query

    const where = {
      ...(status   && { status }),
      ...(category && { category })
    }
    const orderBy = sort === 'votes' ? { votes: 'desc' } : { createdAt: 'desc' }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
      include: {
        user:    { select: { id: true, name: true, avatar: true } },
        replies: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' }
        },
        _count:  { select: { replies: true } }
      }
    })
    res.json({ count: tickets.length, tickets })
  } catch (err) { next(err) }
}

// POST /api/tickets  (protected)
export const createTicket = async (req, res, next) => {
  try {
    const { title, desc, category } = req.body
    const ticket = await prisma.ticket.create({
      data: { title, desc, category, userId: req.user.id },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    })
    res.status(201).json({ ticket })
  } catch (err) { next(err) }
}

// POST /api/tickets/:id/vote  (protected)
export const voteTicket = async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' })

    const existing = await prisma.ticketVote.findUnique({
      where: { userId_ticketId: { userId: req.user.id, ticketId: req.params.id } }
    })

    if (existing) {
      await prisma.ticketVote.delete({ where: { id: existing.id } })
      await prisma.ticket.update({ where: { id: req.params.id }, data: { votes: { decrement: 1 } } })
      return res.json({ voted: false })
    }

    await prisma.ticketVote.create({ data: { userId: req.user.id, ticketId: req.params.id } })
    await prisma.ticket.update({ where: { id: req.params.id }, data: { votes: { increment: 1 } } })
    res.json({ voted: true })
  } catch (err) { next(err) }
}

// POST /api/tickets/:id/replies  (protected)
export const addReply = async (req, res, next) => {
  try {
    const { text } = req.body
    const reply = await prisma.reply.create({
      data: { text, ticketId: req.params.id, userId: req.user.id },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    })
    res.status(201).json({ reply })
  } catch (err) { next(err) }
}

// PATCH /api/tickets/:id/status  (admin only)
export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status }
    })
    res.json({ ticket })
  } catch (err) { next(err) }
}
