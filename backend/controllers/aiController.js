import Groq from 'groq-sdk'
import { prisma } from '../config/db.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are LexAI, a friendly and knowledgeable legal assistant for Law Café — an Indian legal platform.

Your role:
- Help users understand their legal rights and options in simple, plain language
- Cover areas like tenant disputes, startup law, cyber fraud, consumer rights, employment law, family law, and general Indian law
- Always explain legal concepts clearly without jargon
- Suggest when a user should consult a real lawyer
- Be warm, approachable, and supportive — like a knowledgeable friend

Rules:
- Always add a disclaimer that your advice is for informational purposes only and not a substitute for professional legal counsel
- Never give advice on illegal activities
- If asked about non-legal topics, politely redirect to legal matters
- Keep responses concise but complete
- Use Indian legal context (IPC, CrPC, Consumer Protection Act, IT Act, etc.) when relevant`

// POST /api/ai/chat
export const chat = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body
    const userId = req.user?.id || null

    // fetch last 10 messages of this session for context memory
    const history = await prisma.aiChat.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10
    })

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })

    const reply = completion.choices[0].message.content

    // save both user message and assistant reply to DB
    await prisma.aiChat.createMany({
      data: [
        { sessionId, userId, role: 'user',      content: message },
        { sessionId, userId, role: 'assistant', content: reply   }
      ]
    })

    res.json({ reply, sessionId })
  } catch (err) { next(err) }
}

// GET /api/ai/history/:sessionId
export const getHistory = async (req, res, next) => {
  try {
    const messages = await prisma.aiChat.findMany({
      where: { sessionId: req.params.sessionId },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ messages })
  } catch (err) { next(err) }
}

// GET /api/ai/sessions  (protected — user's past sessions)
export const getMySessions = async (req, res, next) => {
  try {
    const sessions = await prisma.aiChat.findMany({
      where: { userId: req.user.id, role: 'user' },
      distinct: ['sessionId'],
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { sessionId: true, content: true, createdAt: true }
    })
    res.json({ sessions })
  } catch (err) { next(err) }
}
