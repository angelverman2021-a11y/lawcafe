import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from './config/db.js'

// roomName → Set of { userId, name, avatar, socketId }
const onlineUsers = new Map()

const addToRoom = (room, user) => {
  if (!onlineUsers.has(room)) onlineUsers.set(room, new Map())
  onlineUsers.get(room).set(user.socketId, user)
}

const removeFromRoom = (room, socketId) => {
  onlineUsers.get(room)?.delete(socketId)
  if (onlineUsers.get(room)?.size === 0) onlineUsers.delete(room)
}

const getRoomUsers = (room) =>
  onlineUsers.has(room) ? [...onlineUsers.get(room).values()] : []

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  })

  // ── Auth middleware ──────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = decoded   // { id, role }
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    // fetch user info once
    const dbUser = await prisma.user.findUnique({
      where: { id: socket.user.id },
      select: { id: true, name: true, avatar: true, role: true }
    })
    if (!dbUser) return socket.disconnect()

    console.log(`🟢 ${dbUser.name} connected [${socket.id}]`)

    // ── JOIN ROOM ──────────────────────────────────────────
    socket.on('room:join', async (room) => {
      socket.join(room)

      const userEntry = { ...dbUser, socketId: socket.id, room }
      addToRoom(room, userEntry)

      // send last 50 messages to the joining user
      const history = await prisma.message.findMany({
        where: { room },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
      })
      socket.emit('room:history', history)

      // broadcast updated presence to room
      io.to(room).emit('room:users', getRoomUsers(room))

      console.log(`📥 ${dbUser.name} joined room: ${room}`)
    })

    // ── LEAVE ROOM ─────────────────────────────────────────
    socket.on('room:leave', (room) => {
      socket.leave(room)
      removeFromRoom(room, socket.id)
      io.to(room).emit('room:users', getRoomUsers(room))
      console.log(`📤 ${dbUser.name} left room: ${room}`)
    })

    // ── SEND MESSAGE ───────────────────────────────────────
    socket.on('message:send', async ({ room, text }) => {
      if (!room || !text?.trim()) return
      if (text.length > 2000) return socket.emit('error', 'Message too long.')

      const message = await prisma.message.create({
        data: { room, text: text.trim(), userId: dbUser.id },
        include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
      })

      // broadcast to everyone in the room (including sender)
      io.to(room).emit('message:new', message)
    })

    // ── TYPING INDICATOR ───────────────────────────────────
    socket.on('typing:start', (room) => {
      socket.to(room).emit('typing:update', { user: dbUser, isTyping: true })
    })

    socket.on('typing:stop', (room) => {
      socket.to(room).emit('typing:update', { user: dbUser, isTyping: false })
    })

    // ── DISCONNECT ─────────────────────────────────────────
    socket.on('disconnect', () => {
      // remove from all rooms this socket was in
      for (const [room] of onlineUsers) {
        if (onlineUsers.get(room)?.has(socket.id)) {
          removeFromRoom(room, socket.id)
          io.to(room).emit('room:users', getRoomUsers(room))
        }
      }
      console.log(`🔴 ${dbUser.name} disconnected [${socket.id}]`)
    })
  })

  return io
}
