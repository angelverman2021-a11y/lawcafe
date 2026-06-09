import { prisma } from '../config/db.js'

// GET /api/groups/:slug/discussions
export const getDiscussions = async (req, res, next) => {
  try {
    const group = await prisma.concernGroup.findUnique({ where: { slug: req.params.slug } })
    if (!group) return res.status(404).json({ error: 'Group not found.' })

    const discussions = await prisma.discussion.findMany({
      where: { groupId: group.id },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        _count: { select: { replies: true, votes: true } }
      }
    })

    res.json({ count: discussions.length, discussions })
  } catch (err) { next(err) }
}

// GET /api/groups/:slug/discussions/:id
export const getDiscussion = async (req, res, next) => {
  try {
    const discussion = await prisma.discussion.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        replies: {
          include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { votes: true } }
      }
    })
    if (!discussion) return res.status(404).json({ error: 'Discussion not found.' })
    res.json({ discussion })
  } catch (err) { next(err) }
}

// POST /api/groups/:slug/discussions  (protected, must be member)
export const createDiscussion = async (req, res, next) => {
  try {
    const { title, content } = req.body
    const group = await prisma.concernGroup.findUnique({ where: { slug: req.params.slug } })
    if (!group) return res.status(404).json({ error: 'Group not found.' })

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.user.id } }
    })
    if (!isMember) return res.status(403).json({ error: 'Join the group to post.' })

    const discussion = await prisma.discussion.create({
      data: { groupId: group.id, userId: req.user.id, title, content },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    })

    await prisma.concernGroup.update({
      where: { id: group.id },
      data: { postCount: { increment: 1 }, updatedAt: new Date() }
    })

    res.status(201).json({ discussion })
  } catch (err) { next(err) }
}

// POST /api/discussions/:id/replies  (protected, must be member)
export const addReply = async (req, res, next) => {
  try {
    const { content } = req.body
    const discussion = await prisma.discussion.findUnique({ where: { id: req.params.id } })
    if (!discussion) return res.status(404).json({ error: 'Discussion not found.' })

    const reply = await prisma.discussionReply.create({
      data: { discussionId: discussion.id, userId: req.user.id, content },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
    })

    // notify discussion author
    if (discussion.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: discussion.userId,
          type: 'NEW_REPLY',
          title: '💬 New reply on your discussion',
          body: `${req.user.name} replied to "${discussion.title}"`,
          link: `/discussions/${discussion.id}`
        }
      })
    }

    res.status(201).json({ reply })
  } catch (err) { next(err) }
}

// POST /api/discussions/:id/vote  (protected)
export const voteDiscussion = async (req, res, next) => {
  try {
    const discussion = await prisma.discussion.findUnique({ where: { id: req.params.id } })
    if (!discussion) return res.status(404).json({ error: 'Discussion not found.' })

    const existing = await prisma.discussionVote.findUnique({
      where: { discussionId_userId: { discussionId: discussion.id, userId: req.user.id } }
    })

    if (existing) {
      await prisma.discussionVote.delete({ where: { id: existing.id } })
      await prisma.discussion.update({ where: { id: discussion.id }, data: { upvotes: { decrement: 1 } } })
      return res.json({ voted: false })
    }

    await prisma.discussionVote.create({ data: { discussionId: discussion.id, userId: req.user.id } })
    await prisma.discussion.update({ where: { id: discussion.id }, data: { upvotes: { increment: 1 } } })
    res.json({ voted: true })
  } catch (err) { next(err) }
}
