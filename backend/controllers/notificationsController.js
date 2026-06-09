import { prisma } from '../config/db.js'

// GET /api/notifications  (protected)
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    const unreadCount = notifications.filter(n => !n.isRead).length
    res.json({ unreadCount, notifications })
  } catch (err) { next(err) }
}

// PATCH /api/notifications/read-all  (protected)
export const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    })
    res.json({ message: 'All notifications marked as read.' })
  } catch (err) { next(err) }
}

// PATCH /api/notifications/:id/read  (protected)
export const markRead = async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    })
    res.json({ success: true })
  } catch (err) { next(err) }
}
