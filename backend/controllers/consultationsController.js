import { prisma } from '../config/db.js'

// POST /api/consultations  (protected — user books a lawyer)
export const createConsultation = async (req, res, next) => {
  try {
    const { lawyerId, groupId, title, description, scheduledAt, duration, mode, type } = req.body

    const lawyer = await prisma.lawyerProfile.findUnique({ where: { id: lawyerId } })
    if (!lawyer || lawyer.verificationStatus !== 'VERIFIED')
      return res.status(404).json({ error: 'Lawyer not found or not verified.' })

    // calculate fee
    const feeMap = { 15: lawyer.feePerSession15, 30: lawyer.feePerSession30, 60: lawyer.feePerSession30 * 2 }
    const amountPaise = type === 'GROUP' ? lawyer.feeGroupSession : (feeMap[duration] || lawyer.feePerSession30)

    const consultation = await prisma.consultation.create({
      data: {
        type:        type || 'INDIVIDUAL',
        mode:        mode || 'VIDEO',
        userId:      req.user.id,
        lawyerId,
        groupId:     groupId || null,
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        duration:    Number(duration),
        amountPaise
      },
      include: {
        lawyer: { include: { user: { select: { name: true, avatar: true } } } }
      }
    })

    res.status(201).json({ consultation })
  } catch (err) { next(err) }
}

// GET /api/consultations/my  (protected — user's own consultations)
export const getMyConsultations = async (req, res, next) => {
  try {
    const consultations = await prisma.consultation.findMany({
      where: { userId: req.user.id },
      orderBy: { scheduledAt: 'desc' },
      include: {
        lawyer: { include: { user: { select: { name: true, avatar: true } } } },
        payment: true,
        privateRoom: { select: { id: true, isActive: true } }
      }
    })
    res.json({ consultations })
  } catch (err) { next(err) }
}

// GET /api/consultations/lawyer  (protected — lawyer's consultations)
export const getLawyerConsultations = async (req, res, next) => {
  try {
    const profile = await prisma.lawyerProfile.findUnique({ where: { userId: req.user.id } })
    if (!profile) return res.status(404).json({ error: 'Lawyer profile not found.' })

    const consultations = await prisma.consultation.findMany({
      where: { lawyerId: profile.id },
      orderBy: { scheduledAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        payment: true,
        privateRoom: { select: { id: true, isActive: true } }
      }
    })
    res.json({ consultations })
  } catch (err) { next(err) }
}

// POST /api/consultations/:id/confirm-payment  (called after Razorpay success)
export const confirmPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
    const consultation = await prisma.consultation.findUnique({ where: { id: req.params.id } })
    if (!consultation) return res.status(404).json({ error: 'Consultation not found.' })
    if (consultation.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized.' })

    // TODO: verify Razorpay signature in Phase 7
    // For now: mark as paid and open private room

    await prisma.payment.upsert({
      where: { consultationId: consultation.id },
      create: {
        consultationId: consultation.id,
        userId: req.user.id,
        amountPaise: consultation.amountPaise,
        status: 'SUCCESS',
        razorpayOrderId, razorpayPaymentId, razorpaySignature
      },
      update: { status: 'SUCCESS', razorpayOrderId, razorpayPaymentId, razorpaySignature }
    })

    await prisma.consultation.update({
      where: { id: consultation.id },
      data: { status: 'PAID' }
    })

    // open private room
    const room = await prisma.privateRoom.create({
      data: { consultationId: consultation.id }
    })

    // notify lawyer
    await prisma.notification.create({
      data: {
        userId: (await prisma.lawyerProfile.findUnique({ where: { id: consultation.lawyerId } })).userId,
        type: 'CONSULTATION_PAID',
        title: '💰 Consultation payment received',
        body: `Payment confirmed for your session on ${new Date(consultation.scheduledAt).toLocaleDateString()}`,
        link: `/dashboard/lawyer/consultations/${consultation.id}`
      }
    })

    res.json({ message: 'Payment confirmed. Private room is now open.', roomId: room.id })
  } catch (err) { next(err) }
}

// GET /api/consultations/:id/room  (protected — user or lawyer)
export const getPrivateRoom = async (req, res, next) => {
  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id: req.params.id },
      include: {
        privateRoom: {
          include: {
            messages: {
              include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
              orderBy: { createdAt: 'asc' },
              take: 100
            },
            documents: {
              include: { user: { select: { id: true, name: true } } }
            }
          }
        },
        lawyer: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        user:   { select: { id: true, name: true, avatar: true } }
      }
    })

    if (!consultation) return res.status(404).json({ error: 'Consultation not found.' })

    // only the booked user or the lawyer can access
    const lawyerUserId = consultation.lawyer.userId
    if (consultation.userId !== req.user.id && lawyerUserId !== req.user.id)
      return res.status(403).json({ error: 'Access denied.' })

    if (!consultation.privateRoom)
      return res.status(402).json({ error: 'Payment required to access this room.' })

    res.json({ room: consultation.privateRoom, consultation })
  } catch (err) { next(err) }
}
