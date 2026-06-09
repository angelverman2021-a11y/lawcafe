import { prisma } from '../config/db.js'
import { generateSlug } from '../utils/slug.js'

// GET /api/groups
export const getGroups = async (req, res, next) => {
  try {
    const { category, search, sort } = req.query

    const where = {
      status: 'ACTIVE',
      isPrivate: false,
      ...(category && { category }),
      ...(search && {
        OR: [
          { title:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags:        { has: search } }
        ]
      })
    }

    const orderBy = sort === 'members'  ? { memberCount: 'desc' }
                  : sort === 'activity' ? { updatedAt: 'desc' }
                  : { createdAt: 'desc' }

    const groups = await prisma.concernGroup.findMany({
      where,
      orderBy,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        lawyers: {
          include: {
            lawyer: {
              select: { id: true, specializations: true, rating: true,
                user: { select: { name: true, avatar: true } } }
            }
          }
        },
        _count: { select: { members: true, discussions: true } }
      }
    })

    res.json({ count: groups.length, groups })
  } catch (err) { next(err) }
}

// GET /api/groups/:slug
export const getGroup = async (req, res, next) => {
  try {
    const group = await prisma.concernGroup.findUnique({
      where: { slug: req.params.slug },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
          orderBy: { joinedAt: 'asc' },
          take: 20
        },
        lawyers: {
          include: {
            lawyer: {
              include: { user: { select: { id: true, name: true, avatar: true } } }
            }
          }
        },
        _count: { select: { members: true, discussions: true } }
      }
    })

    if (!group) return res.status(404).json({ error: 'Group not found.' })
    res.json({ group })
  } catch (err) { next(err) }
}

// POST /api/groups  (protected)
export const createGroup = async (req, res, next) => {
  try {
    const { title, description, category, tags, isPrivate } = req.body

    const slug = await generateSlug(title)

    const group = await prisma.concernGroup.create({
      data: {
        title, description, category,
        tags: tags || [],
        isPrivate: isPrivate || false,
        slug,
        creatorId: req.user.id,
        memberCount: 1
      }
    })

    // auto-join creator as CREATOR
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: req.user.id, role: 'CREATOR' }
    })

    res.status(201).json({ group })
  } catch (err) { next(err) }
}

// POST /api/groups/:slug/join  (protected)
export const joinGroup = async (req, res, next) => {
  try {
    const group = await prisma.concernGroup.findUnique({ where: { slug: req.params.slug } })
    if (!group) return res.status(404).json({ error: 'Group not found.' })

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.user.id } }
    })
    if (existing) return res.status(409).json({ error: 'Already a member.' })

    await prisma.groupMember.create({
      data: { groupId: group.id, userId: req.user.id }
    })
    await prisma.concernGroup.update({
      where: { id: group.id },
      data: { memberCount: { increment: 1 } }
    })

    res.json({ message: 'Joined group successfully.' })
  } catch (err) { next(err) }
}

// DELETE /api/groups/:slug/leave  (protected)
export const leaveGroup = async (req, res, next) => {
  try {
    const group = await prisma.concernGroup.findUnique({ where: { slug: req.params.slug } })
    if (!group) return res.status(404).json({ error: 'Group not found.' })

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: group.id, userId: req.user.id } }
    })
    await prisma.concernGroup.update({
      where: { id: group.id },
      data: { memberCount: { decrement: 1 } }
    })

    res.json({ message: 'Left group.' })
  } catch (err) { next(err) }
}

// POST /api/groups/:slug/lawyers  (lawyer only — join as lawyer)
export const lawyerJoinGroup = async (req, res, next) => {
  try {
    const { note } = req.body

    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user.id } })
    if (!profile || profile.verificationStatus !== 'VERIFIED')
      return res.status(403).json({ error: 'Only verified lawyers can join groups.' })

    const group = await prisma.concernGroup.findUnique({ where: { slug: req.params.slug } })
    if (!group) return res.status(404).json({ error: 'Group not found.' })

    const existing = await prisma.groupLawyer.findUnique({
      where: { groupId_lawyerId: { groupId: group.id, lawyerId: profile.id } }
    })
    if (existing) return res.status(409).json({ error: 'Already in this group.' })

    await prisma.groupLawyer.create({
      data: { groupId: group.id, lawyerId: profile.id, note }
    })

    // notify all group members
    const members = await prisma.groupMember.findMany({ where: { groupId: group.id } })
    await prisma.notification.createMany({
      data: members.map(m => ({
        userId: m.userId,
        type: 'LAWYER_JOINED_GROUP',
        title: '⚖️ A verified lawyer joined your group',
        body: `${req.user.name} (Verified Lawyer) has joined "${group.title}"`,
        link: `/groups/${group.slug}`
      }))
    })

    res.json({ message: 'Joined group as lawyer.' })
  } catch (err) { next(err) }
}
