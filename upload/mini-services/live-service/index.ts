import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// In-memory room state (DB is source of truth for persistence, but we keep an
// in-memory mirror for fast leaderboard reads during a live game)
interface RoomPlayer {
  id: string
  name: string
  score: number
  correct: number
  wrong: number
  bestStreak: number
  coins: number
  isHost: boolean
  socketId: string | null
  online: boolean
}
interface RoomState {
  code: string
  status: 'lobby' | 'playing' | 'ended'
  mode: string
  setId: string
  players: Map<string, RoomPlayer> // by player.id
}
const rooms = new Map<string, RoomState>()

function getRoom(code: string): RoomState | undefined {
  return rooms.get(code.toUpperCase())
}
function ensureRoom(code: string, setId: string, mode: string): RoomState {
  const upper = code.toUpperCase()
  let r = rooms.get(upper)
  if (!r) {
    r = { code: upper, status: 'lobby', mode, setId, players: new Map() }
    rooms.set(upper, r)
  }
  return r
}
function snapshot(r: RoomState) {
  return {
    code: r.code,
    status: r.status,
    mode: r.mode,
    setId: r.setId,
    players: Array.from(r.players.values()).sort((a, b) => b.score - a.score),
  }
}

io.on('connection', (socket: Socket) => {
  console.log(`[live] connected ${socket.id}`)

  socket.on('join-room', (data: { code: string; player: { id: string; name: string; isHost?: boolean } }) => {
    const code = (data?.code || '').toUpperCase()
    const player = data?.player
    if (!code || !player?.id || !player?.name) return
    const r = rooms.get(code)
    if (!r) {
      socket.emit('join-error', { message: 'Room not found. Ask your teacher for the code.' })
      return
    }
    if (r.status === 'ended') {
      socket.emit('join-error', { message: 'This room has ended.' })
      return
    }

    // Add or update player
    let p = r.players.get(player.id)
    if (!p) {
      p = {
        id: player.id,
        name: player.name,
        score: 0, correct: 0, wrong: 0, bestStreak: 0, coins: 0,
        isHost: !!player.isHost,
        socketId: socket.id,
        online: true,
      }
      r.players.set(player.id, p)
    } else {
      p.socketId = socket.id
      p.online = true
      p.name = player.name
      if (player.isHost) p.isHost = true
    }
    socket.data.code = code
    socket.data.playerId = player.id
    socket.join(code)
    console.log(`[live] ${player.name} joined room ${code} (${r.players.size} players)`)
    io.to(code).emit('room-state', snapshot(r))
  })

  socket.on('start-game', (data: { code: string }) => {
    const r = getRoom(data.code)
    if (!r) return
    r.status = 'playing'
    io.to(r.code).emit('game-start', { code: r.code })
    io.to(r.code).emit('room-state', snapshot(r))
    console.log(`[live] game started in ${r.code}`)
  })

  socket.on('end-game', (data: { code: string }) => {
    const r = getRoom(data.code)
    if (!r) return
    r.status = 'ended'
    io.to(r.code).emit('room-state', snapshot(r))
    io.to(r.code).emit('game-ended', { code: r.code })
    console.log(`[live] game ended in ${r.code}`)
  })

  socket.on('score-update', (data: {
    code: string
    playerId: string
    score: number
    correct: number
    wrong: number
    bestStreak: number
    coins: number
  }) => {
    const r = getRoom(data.code)
    if (!r) return
    const p = r.players.get(data.playerId)
    if (!p) return
    p.score = Math.max(p.score, Math.floor(data.score))
    p.correct = Math.max(p.correct, data.correct)
    p.wrong = Math.max(p.wrong, data.wrong)
    p.bestStreak = Math.max(p.bestStreak, data.bestStreak)
    p.coins = Math.max(p.coins, data.coins)
    // Broadcast leaderboard (throttled by client; server just relays)
    io.to(r.code).emit('room-state', snapshot(r))
  })

  socket.on('answer', (data: { code: string; playerId: string; correct: boolean; question: string }) => {
    // Optional: relay to host so they can see live answer feed
    const r = getRoom(data.code)
    if (!r) return
    socket.to(r.code).emit('player-answer', {
      playerId: data.playerId,
      correct: data.correct,
      question: data.question,
    })
  })

  socket.on('disconnect', () => {
    const code = socket.data.code as string | undefined
    const playerId = socket.data.playerId as string | undefined
    if (code && playerId) {
      const r = rooms.get(code)
      if (r) {
        const p = r.players.get(playerId)
        if (p) {
          p.online = false
          p.socketId = null
          io.to(code).emit('room-state', snapshot(r))
          console.log(`[live] ${p.name} disconnected from ${code}`)
        }
      }
    }
  })

  socket.on('error', (err) => console.error('[live] socket error', err))
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[live] socket.io server running on port ${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
