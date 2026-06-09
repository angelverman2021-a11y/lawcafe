import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import passport from './config/passport.js'
import { initSocket } from './socket.js'

import authRoutes          from './routes/auth.js'
import userRoutes          from './routes/users.js'
import lawyerRoutes        from './routes/lawyers.js'
import groupRoutes         from './routes/groups.js'
import discussionRoutes    from './routes/discussions.js'
import consultationRoutes  from './routes/consultations.js'
import notificationRoutes  from './routes/notifications.js'
import chatRoutes          from './routes/chat.js'
import aiRoutes            from './routes/ai.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { sanitizeInputs } from './middleware/sanitize.js'
import { generateToken, doubleCsrfProtection } from './middleware/csrf.js'

const app        = express()
const httpServer = createServer(app)
const PORT       = process.env.PORT || 4000

initSocket(httpServer)

// ── Security ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}))

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000'
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// ── Rate limiting ─────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}))
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.' }
}))

// ── Body parsing ──────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(sanitizeInputs)
app.use(doubleCsrfProtection)
app.use(passport.initialize())

// ── Logging ───────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

// ── CSRF token endpoint ──────────────────
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: generateToken(req, res) })
})

// ── Health check ──────────────────────────
app.get('/health', (_, res) => res.json({
  status:    'ok',
  platform:  'Law Café API',
  env:       process.env.NODE_ENV,
  timestamp: new Date().toISOString()
}))

// ── Routes ────────────────────────────────
app.use('/api/auth',          authRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/lawyers',       lawyerRoutes)
app.use('/api/groups',        groupRoutes)
app.use('/api/discussions',   discussionRoutes)
app.use('/api/consultations', consultationRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat',          chatRoutes)
app.use('/api/ai',            aiRoutes)

// ── Error handling ────────────────────────
app.use(notFound)
app.use(errorHandler)

httpServer.listen(PORT, () => {
  console.log(`\n⚖️  Law Café API`)
  console.log(`🚀 Running  → http://localhost:${PORT}`)
  console.log(`❤️  Health  → http://localhost:${PORT}/health`)
  console.log(`📦 Env      → ${process.env.NODE_ENV}\n`)
})

export default app
