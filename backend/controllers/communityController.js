import { prisma } from '../config/db.js'

// GET /api/community/posts
export const getPosts = async (req, res, next) => {
  try {
    const { tag, sort } = req.query
    const where = tag ? { tag } : {}
    const orderBy = sort === 'top' ? { likes: 'desc' } : { createdAt: 'desc' }

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      include: {
        user:    { select: { id: true, name: true, avatar: true, role: true } },
        _count:  { select: { comments: true, postLikes: true } }
      }
    })
    res.json({ count: posts.length, posts })
  } catch (err) { next(err) }
}

// POST /api/community/posts  (protected)
export const createPost = async (req, res, next) => {
  try {
    const { content, tag } = req.body
    const post = await prisma.post.create({
      data: { content, tag: tag || 'general', userId: req.user.id },
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
    })
    res.status(201).json({ post })
  } catch (err) { next(err) }
}

// POST /api/community/posts/:id/like  (protected)
export const likePost = async (req, res, next) => {
  try {
    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId: req.user.id, postId: req.params.id } }
    })
    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } })
      await prisma.post.update({ where: { id: req.params.id }, data: { likes: { decrement: 1 } } })
      return res.json({ liked: false })
    }
    await prisma.postLike.create({ data: { userId: req.user.id, postId: req.params.id } })
    await prisma.post.update({ where: { id: req.params.id }, data: { likes: { increment: 1 } } })
    res.json({ liked: true })
  } catch (err) { next(err) }
}

// POST /api/community/posts/:id/comments  (protected)
export const addComment = async (req, res, next) => {
  try {
    const { text } = req.body
    const comment = await prisma.comment.create({
      data: { text, postId: req.params.id, userId: req.user.id },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    })
    res.status(201).json({ comment })
  } catch (err) { next(err) }
}
