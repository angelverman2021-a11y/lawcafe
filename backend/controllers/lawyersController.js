import { prisma } from '../config/db.js'

// POST /api/lawyers/apply
// Lawyer submits their profile for verification
export const applyAsLawyer = async (req, res, next) => {
  try {
    const {
      barNumber, barCouncilState, enrollmentYear,
      specializations, experience, education,
      courtsOfPractice, languages, bio,
      linkedin, website,
      feePerSession15, feePerSession30, feeGroupSession, feeFollowUp,
      barCertificateUrl, idProofUrl, degreeUrl
    } = req.body

    // check user is LAWYER role
    if (req.user.role !== 'LAWYER')
      return res.status(403).json({ error: 'Only accounts registered as Lawyer can apply.' })

    // check no existing profile
    const existing = await prisma.lawyerProfile.findUnique({ where: { userId: req.user.id } })
    if (existing) return res.status(409).json({ error: 'Lawyer profile already submitted.' })

    const profile = await prisma.lawyerProfile.create({
      data: {
        userId: req.user.id,
        barNumber, barCouncilState,
        enrollmentYear: Number(enrollmentYear),
        specializations: specializations || [],
        experience: Number(experience),
        education,
        courtsOfPractice: courtsOfPractice || [],
        languages: languages || [],
        bio,
        linkedin, website,
        feePerSession15: feePerSession15 ? Number(feePerSession15) : undefined,
        feePerSession30: feePerSession30 ? Number(feePerSession30) : undefined,
        feeGroupSession: feeGroupSession ? Number(feeGroupSession) : undefined,
        feeFollowUp:     feeFollowUp     ? Number(feeFollowUp)     : undefined,
        barCertificateUrl, idProofUrl, degreeUrl
      }
    })

    // notify admins (future: emit socket event)
    res.status(201).json({
      message: 'Application submitted. You will be notified once verified by our team.',
      profile
    })
  } catch (err) { next(err) }
}

// GET /api/lawyers
// Browse verified lawyers — public
export const getLawyers = async (req, res, next) => {
  try {
    const { specialization, available, sort, search } = req.query

    const where = {
      verificationStatus: 'VERIFIED',
      ...(available && { isAvailable: available === 'true' }),
      ...(specialization && {
        specializations: { has: specialization }
      }),
      ...(search && {
        OR: [
          { bio: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } }
        ]
      })
    }

    const orderBy = sort === 'fee-low'    ? { feePerSession30: 'asc' }
                  : sort === 'fee-high'   ? { feePerSession30: 'desc' }
                  : sort === 'experience' ? { experience: 'desc' }
                  : { rating: 'desc' }

    const lawyers = await prisma.lawyerProfile.findMany({
      where,
      orderBy,
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    })

    res.json({ count: lawyers.length, lawyers })
  } catch (err) { next(err) }
}

// GET /api/lawyers/:id
export const getLawyer = async (req, res, next) => {
  try {
    const lawyer = await prisma.lawyerProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        reviews: {
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })
    if (!lawyer || lawyer.verificationStatus !== 'VERIFIED')
      return res.status(404).json({ error: 'Lawyer not found.' })

    res.json({ lawyer })
  } catch (err) { next(err) }
}

// PATCH /api/lawyers/profile  (own profile update)
export const updateLawyerProfile = async (req, res, next) => {
  try {
    const allowed = ['bio', 'languages', 'isAvailable',
      'feePerSession15', 'feePerSession30', 'feeGroupSession', 'feeFollowUp',
      'linkedin', 'website']

    const data = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k] })

    const profile = await prisma.lawyerProfile.update({
      where: { userId: req.user.id },
      data
    })
    res.json({ profile })
  } catch (err) { next(err) }
}

// ── ADMIN ONLY ──

// GET /api/lawyers/admin/pending
export const getPendingLawyers = async (req, res, next) => {
  try {
    const lawyers = await prisma.lawyerProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ count: lawyers.length, lawyers })
  } catch (err) { next(err) }
}

// PATCH /api/lawyers/admin/:id/verify
export const verifyLawyer = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body // action: 'approve' | 'reject'

    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED'
    const profile = await prisma.lawyerProfile.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: status,
        verifiedAt: action === 'approve' ? new Date() : null,
        verifiedBy: req.user.id,
        rejectionReason: action === 'reject' ? rejectionReason : null
      },
      include: { user: true }
    })

    // notify the lawyer
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        type: action === 'approve' ? 'LAWYER_VERIFIED' : 'LAWYER_REJECTED',
        title: action === 'approve' ? '🎉 You are now a Verified Lawyer!' : 'Verification Update',
        body: action === 'approve'
          ? 'Your profile has been verified. You can now join groups and accept consultations.'
          : `Your application was not approved. Reason: ${rejectionReason}`,
        link: '/dashboard/lawyer'
      }
    })

    res.json({ message: `Lawyer ${action}d successfully.`, profile })
  } catch (err) { next(err) }
}
