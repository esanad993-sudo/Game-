'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllGameModes, getGameMode } from '@/lib/engine/registry'
import type { GameModeId, GameModeConfig } from '@/lib/engine/types'

// ─── Types ───
type View = 'home' | 'sets' | 'create-set' | 'live' | 'solo' | 'mode-select' | 'homework' | 'shop' | 'achievements' | 'friends' | 'profile'
type UserRole = 'teacher' | 'student'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  coins: number
  streak: number
  avatarColor: string
  carSkin: string
  bio?: string
}

interface QuestionSet {
  id: string
  title: string
  subject?: string
  gradeLevel?: string
  description?: string
  isPublic: boolean
  creatorId: string
  creator?: { name: string }
  _count?: { questions: number }
  questions?: Question[]
}

interface Question {
  id: string
  text: string
  choices: string
  correctIdx: number
  explanation?: string
  order: number
}

interface ShopItem {
  id: string
  key: string
  name: string
  description: string
  category: string
  price: number
  icon: string
  rarity: string
}

interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  requirement: number
}

interface UserAchievement {
  id: string
  achievementId: string
  achievement: Achievement
  unlockedAt: string
}

interface GameResult {
  id: string
  gameType: string
  score: number
  correct: number
  wrong: number
  bestStreak: number
  coinsEarned: number
  duration?: number
  createdAt: string
}

interface Homework {
  id: string
  title: string
  description?: string
  dueDate?: string
  mode: string
  set?: { title: string; subject?: string }
  _count?: { submissions: number }
}

// ─── API helpers ───
const api = {
  get: async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`GET ${url} failed`)
    return res.json()
  },
  post: async (url: string, data: any) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `POST ${url} failed`) }
    return res.json()
  },
  patch: async (url: string, data: any) => {
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error(`PATCH ${url} failed`)
    return res.json()
  },
  del: async (url: string) => {
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) throw new Error(`DELETE ${url} failed`)
    return res.json()
  },
}

// ─── Safe user defaults ───
function normalizeUser(u: any): User {
  return {
    id: u.id ?? '',
    name: u.name ?? 'Player',
    email: u.email ?? '',
    role: u.role ?? 'student',
    coins: u.coins ?? 0,
    streak: u.streak ?? 0,
    avatarColor: u.avatarColor ?? '#14B8A6',
    carSkin: u.carSkin ?? 'default',
    bio: u.bio ?? '',
  }
}

// ─── Main App ───
export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<View>('home')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read from localStorage on mount - this is intentional initialization
    const saved = localStorage.getItem('gameforge_user') || localStorage.getItem('turborush_user')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Use a microtask to avoid synchronous setState in effect
        queueMicrotask(() => setUser(normalizeUser(parsed)))
      } catch {}
    }
    queueMicrotask(() => setMounted(true))
  }, [])

  const login = (u: User) => {
    const safe = normalizeUser(u)
    setUser(safe)
    localStorage.setItem('gameforge_user', JSON.stringify(safe))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('gameforge_user')
    localStorage.removeItem('turborush_user')
    setView('home')
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center gf-bg">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <img src="/logo.jpeg" alt="GameForge" className="w-20 h-20 rounded-2xl" />
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onLogin={login} />
  }

  return (
    <AppShell user={user} view={view} setView={setView} onLogout={logout} />
  )
}

// ─── Auth Screen ───
function AuthScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const result = await api.post('/api/auth/register', { name, email, password, role })
        onLogin(result)
      } else {
        const result = await api.post('/api/auth/login', { email, password }).catch(() => null)
        if (!result) {
          setError('Invalid email or password')
          setLoading(false)
          return
        }
        onLogin(result)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gf-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="gf-card p-8 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mb-2 flex justify-center"
          >
            <img src="/logo.jpeg" alt="GameForge" className="w-16 h-16 rounded-2xl" />
          </motion.div>
          <h1 className="gf-font-display text-3xl text-gf-dark">GameForge</h1>
          <p className="text-gf-dark/60 font-bold mt-1">Create & Play Quiz Games</p>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              mode === 'login'
                ? 'bg-gf-dark text-white'
                : 'bg-gf-light text-gf-dark border-2 border-gf-dark'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              mode === 'register'
                ? 'bg-gf-dark text-white'
                : 'bg-gf-light text-gf-dark border-2 border-gf-dark'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-gf-dark font-bold text-sm mb-1 block">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="gf-input"
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="text-gf-dark font-bold text-sm mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="gf-input"
              placeholder="you@school.edu"
              required
            />
          </div>

          <div>
            <label className="text-gf-dark font-bold text-sm mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="gf-input"
              placeholder="••••••••"
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-gf-dark font-bold text-sm mb-2 block">I am a...</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                    role === 'student'
                      ? 'bg-gf-teal border-gf-dark text-white'
                      : 'bg-white border-gf-dark/20 text-gf-dark/60'
                  }`}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                    role === 'teacher'
                      ? 'bg-gf-warning border-gf-dark text-gf-dark'
                      : 'bg-white border-gf-dark/20 text-gf-dark/60'
                  }`}
                >
                  👩‍🏫 Teacher
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-gf-danger/10 text-gf-danger p-3 rounded-xl text-sm font-bold">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="gf-btn w-full"
          >
            {loading ? '⏳' : mode === 'login' ? '🚀 Sign In' : '✨ Create Account'}
          </button>
        </form>

        <p className="text-center text-gf-dark/40 text-xs mt-4 font-bold">
          By signing in, you agree to have fun and learn!
        </p>
      </motion.div>
    </div>
  )
}

// ─── App Shell ───
function AppShell({ user, view, setView, onLogout }: {
  user: User
  view: View
  setView: (v: View) => void
  onLogout: () => void
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems: { key: View; label: string; icon: string; teacher?: boolean; student?: boolean }[] = [
    { key: 'home', label: 'Dashboard', icon: '🏠' },
    { key: 'mode-select', label: 'Play', icon: '🎮' },
    { key: 'live', label: 'Live Game', icon: '📡' },
    { key: 'sets', label: 'Question Sets', icon: '📚' },
    { key: 'homework', label: 'Homework', icon: '📝' },
    { key: 'shop', label: 'Shop', icon: '🛒', student: true },
    { key: 'achievements', label: 'Achievements', icon: '🏆', student: true },
    { key: 'friends', label: 'Friends', icon: '👥', student: true },
    { key: 'profile', label: 'Profile', icon: '⚙️' },
  ]

  const filteredNav = navItems.filter(item => {
    if (user.role === 'teacher' && item.student && !item.teacher) return false
    return true
  })

  return (
    <div className="min-h-screen gf-bg flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} bg-gf-surface text-white transition-all duration-300 shrink-0`}>
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <img src="/logo.jpeg" alt="GameForge" className="w-9 h-9 rounded-lg" />
          </motion.div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="gf-font-display text-lg leading-tight">GameForge</h1>
              <p className="text-[10px] text-gf-teal font-bold">Quiz Platform</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {filteredNav.map(item => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-bold ${
                view === item.key
                  ? 'bg-gf-teal text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
          <a
            href="/modes/editor"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-bold text-gf-warning hover:bg-white/10"
            title="Create your own game modes"
          >
            <span className="text-xl">🎨</span>
            {sidebarOpen && <span>Mode Editor</span>}
          </a>
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: user.avatarColor || '#14B8A6' }}
            >
              {user.name[0].toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <div className="flex items-center gap-1 text-xs text-gf-warning">
                  <span>🪙</span> <span>{user.coins.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={onLogout}
              className="mt-2 w-full text-xs text-white/50 hover:text-white/80 transition-colors font-bold"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-white/30 hover:text-white/60 transition-colors text-xs"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gf-surface text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="GameForge" className="w-7 h-7 rounded-lg" />
          <span className="gf-font-display text-sm">GameForge</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gf-warning text-sm font-bold">🪙 {user.coins.toLocaleString()}</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-2xl">
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="lg:hidden fixed inset-0 z-40 bg-gf-surface pt-16"
          >
            <nav className="p-4 space-y-2">
              {filteredNav.map(item => (
                <button
                  key={item.key}
                  onClick={() => { setView(item.key); setMobileMenuOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                    view === item.key
                      ? 'bg-gf-teal text-white'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <a
                href="/modes/editor"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gf-warning text-sm font-bold"
              >
                <span className="text-2xl">🎨</span>
                <span>Mode Editor</span>
              </a>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:text-white/80 text-sm font-bold"
              >
                <span className="text-2xl">🚪</span>
                <span>Sign Out</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-screen lg:pt-0 pt-14 overflow-y-auto">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'home' && <DashboardView user={user} setView={setView} />}
              {view === 'mode-select' && <ModeSelectView user={user} setView={setView} />}
              {view === 'solo' && <SoloView user={user} setView={setView} />}
              {view === 'live' && <LiveView user={user} />}
              {view === 'sets' && <SetsView user={user} setView={setView} />}
              {view === 'create-set' && <CreateSetView user={user} setView={setView} />}
              {view === 'homework' && <HomeworkView user={user} />}
              {view === 'shop' && <ShopView user={user} />}
              {view === 'achievements' && <AchievementsView user={user} />}
              {view === 'friends' && <FriendsView user={user} />}
              {view === 'profile' && <ProfileView user={user} onLogout={onLogout} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ─── Game Mode Selector View ───
function ModeSelectView({ user, setView }: { user: User; setView: (v: View) => void }) {
  const modes = getAllGameModes()

  const difficultyColors: Record<string, string> = {
    easy: 'bg-gf-success/10 text-gf-success',
    medium: 'bg-gf-warning/10 text-gf-warning',
    hard: 'bg-gf-danger/10 text-gf-danger',
  }

  const modeColorMap: Record<string, string> = {
    'classic': 'from-gf-teal to-gf-blue',
    'racing': 'from-gf-purple to-gf-pink-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gf-font-display text-2xl text-gf-dark">🎮 Choose Your Game Mode</h1>
          <p className="text-gf-dark/60 font-bold">Pick a mode and start playing!</p>
        </div>
        <button onClick={() => setView('home')} className="gf-btn gf-btn-outline text-sm">← Back</button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {modes.map((m) => (
          <motion.div
            key={m.id}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="gf-card gf-stat-card overflow-hidden cursor-pointer"
            onClick={() => setView('solo')}
          >
            {/* Gradient header */}
            <div className={`bg-gradient-to-r ${modeColorMap[m.id] || 'from-gf-teal to-gf-blue'} p-5 text-white`}>
              <div className="flex items-center justify-between">
                <span className="text-4xl">{m.icon}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${difficultyColors[m.difficulty]}`}>
                  {m.difficulty.toUpperCase()}
                </span>
              </div>
              <h2 className="gf-font-display text-xl mt-3">{m.name}</h2>
              <p className="text-white/80 text-sm mt-1">{m.description}</p>
            </div>
            {/* Info footer */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-gf-dark/60 font-bold">
                <span>👥 {m.playerCount.min}-{m.playerCount.max}</span>
                {m.hasTimer && <span>⏱️ Timed</span>}
                {m.hasPowerUps && <span>⚡ Power-Ups</span>}
              </div>
              <button className="gf-btn text-xs py-2 px-4">
                Play →
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard View ───

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target
    const start = 0
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(start + (target - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return count
}

// Circular progress ring component
function ProgressRing({ progress, size, strokeWidth, color }: { progress: number; size: number; strokeWidth: number; color: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gf-dark/10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

// Time ago helper
function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

// Mode color map for gradients
const modeColorMap: Record<string, string> = {
  'classic': 'from-gf-teal to-emerald-400',
  'racing': 'from-gf-purple to-pink-400',
}

const modeSolidColor: Record<string, string> = {
  'classic': '#14B8A6',
  'racing': '#8B5CF6',
}

function DashboardView({ user, setView }: { user: User; setView: (v: View) => void }) {
  const [stats, setStats] = useState<{ gamesPlayed: number; totalCorrect: number; totalCoins: number; bestStreak: number } | null>(null)
  const [recentGames, setRecentGames] = useState<GameResult[]>([])
  const [homeworks, setHomeworks] = useState<Homework[]>([])

  useEffect(() => {
    api.get(`/api/game-results?userId=${user.id}`).then((data: GameResult[]) => {
      setRecentGames(data.slice(0, 8))
      setStats({
        gamesPlayed: data.length,
        totalCorrect: data.reduce((s, g) => s + g.correct, 0),
        totalCoins: data.reduce((s, g) => s + g.coinsEarned, 0),
        bestStreak: Math.max(0, ...data.map(g => g.bestStreak)),
      })
    }).catch(() => {})
    api.get('/api/homework').then(setHomeworks).catch(() => {})
  }, [user.id])

  const isTeacher = user.role === 'teacher'
  const gameModes = getAllGameModes()

  // Animated counters
  const gamesPlayedCount = useAnimatedCounter(stats?.gamesPlayed ?? 0)
  const totalCorrectCount = useAnimatedCounter(stats?.totalCorrect ?? 0)
  const totalCoinsCount = useAnimatedCounter(stats?.totalCoins ?? 0)
  const bestStreakCount = useAnimatedCounter(stats?.bestStreak ?? 0)

  // Calculate correct rate
  const totalQuestions = (stats?.totalCorrect ?? 0) + (recentGames.reduce((s, g) => s + g.wrong, 0))
  const correctRate = totalQuestions > 0 ? Math.round(((stats?.totalCorrect ?? 0) / totalQuestions) * 100) : 0

  // Daily challenge progress (simulated based on recent games)
  const dailyGoal = 20
  const dailyProgress = Math.min(stats?.totalCorrect ?? 0, dailyGoal)
  const dailyProgressPct = Math.round((dailyProgress / dailyGoal) * 100)

  // Compute XP and level
  const totalXP = (stats?.gamesPlayed ?? 0) * 50 + (stats?.totalCorrect ?? 0) * 10
  const level = Math.floor(totalXP / 500) + 1
  const xpInLevel = totalXP % 500
  const xpPct = Math.round((xpInLevel / 500) * 100)

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }

  return (
    <motion.div
      className="space-y-5 -mt-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ─── 1. Hero Welcome Banner ─── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gf-teal via-gf-blue to-gf-purple p-6 lg:p-8 border-3 border-gf-dark"
        style={{ boxShadow: '0 6px 0 0 #0F172A, 0 14px 30px rgba(15, 23, 42, 0.25)' }}
      >
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-white/5 rounded-full" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center text-white text-2xl lg:text-3xl font-bold border-3 border-white/40 shadow-lg"
              style={{ background: user.avatarColor || '#14B8A6' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="gf-font-display text-2xl lg:text-3xl text-white drop-shadow-sm">
                Hey, {user.name.split(' ')[0]}!
              </h1>
              <p className="text-white/80 font-bold mt-0.5 text-sm lg:text-base">
                {isTeacher ? '🎓 Ready to engage your class?' : '⚡ Ready to forge some knowledge?'}
              </p>
            </div>
          </div>

          {/* Floating chips: coins + streak + level */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Level chip */}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border-2 border-white/30">
              <span className="text-white text-sm">⭐</span>
              <span className="text-white font-bold text-sm">Lvl {level}</span>
            </div>
            {/* XP bar */}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border-2 border-white/30">
              <div className="w-16 h-2 bg-white/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gf-warning rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-white/80 font-bold text-xs">{xpInLevel}/500</span>
            </div>
            {/* Coins chip */}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border-2 border-white/30">
              <span className="text-sm">🪙</span>
              <span className="text-white font-bold text-sm">{user.coins.toLocaleString()}</span>
            </div>
            {/* Streak chip */}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border-2 border-white/30">
              <motion.span
                className="text-sm"
                animate={user.streak > 0 ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
              >
                🔥
              </motion.span>
              <span className="text-white font-bold text-sm">{user.streak} day{user.streak !== 1 ? 's' : ''}</span>
            </div>
            {/* Daily progress ring */}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border-2 border-white/30">
              <div className="relative w-7 h-7">
                <ProgressRing progress={dailyProgressPct} size={28} strokeWidth={4} color="#22C55E" />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                  {dailyProgressPct}%
                </span>
              </div>
              <span className="text-white/80 font-bold text-xs hidden sm:inline">Daily</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Game Mode Carousel (THE STAR) ─── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="gf-font-display text-lg text-gf-dark">🎮 Choose Your Mode</h2>
          <button onClick={() => setView('mode-select')} className="text-gf-teal font-bold text-sm hover:underline">View All →</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3 gf-scrollbar snap-x snap-mandatory">
          {gameModes.map((m, i) => (
            <motion.button
              key={m.id}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setView('solo')}
              className="relative min-w-[220px] sm:min-w-[260px] shrink-0 snap-start rounded-2xl overflow-hidden cursor-pointer border-3 border-gf-dark group"
              style={{ boxShadow: '0 5px 0 0 #0F172A, 0 10px 20px rgba(15, 23, 42, 0.2)' }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            >
              {/* Gradient bg */}
              <div className={`bg-gradient-to-br ${modeColorMap[m.id] || 'from-gf-teal to-gf-blue'} p-5 text-white min-h-[180px] sm:min-h-[200px] flex flex-col justify-between relative overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />

                {/* Top row: badges */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex flex-wrap gap-1.5">
                    {m.id === 'classic' && (
                      <span className="text-[10px] font-bold bg-white/30 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-white/40 uppercase tracking-wider">
                        ⭐ Most Popular
                      </span>
                    )}
                    {m.id === 'racing' && (
                      <span className="text-[10px] font-bold bg-gf-warning/90 text-gf-dark rounded-full px-2.5 py-0.5 border border-gf-dark/20 uppercase tracking-wider">
                        ✨ New
                      </span>
                    )}
                    <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border border-white/30 ${
                      m.difficulty === 'easy' ? 'bg-gf-success/80' : m.difficulty === 'medium' ? 'bg-gf-warning/80 text-gf-dark' : 'bg-gf-danger/80'
                    }`}>
                      {m.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/30">
                    👥 {m.playerCount.min}-{m.playerCount.max}
                  </span>
                </div>

                {/* Icon + Name */}
                <div className="relative z-10">
                  <span className="text-5xl sm:text-6xl block mb-1 drop-shadow-lg">{m.icon}</span>
                  <h3 className="gf-font-display text-xl sm:text-2xl text-white drop-shadow-sm">{m.name}</h3>
                  <p className="text-white/75 text-xs sm:text-sm mt-1 line-clamp-2 font-semibold">{m.description}</p>
                </div>

                {/* PLAY button */}
                <motion.div
                  className="mt-3 relative z-10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="inline-flex items-center gap-2 bg-white text-gf-dark font-bold text-sm px-5 py-2 rounded-xl border-2 border-gf-dark shadow-[0_3px_0_0_#0F172A]">
                    ▶ PLAY
                  </div>
                </motion.div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── 3. Stats Row ─── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <AnimatedStatCard
          icon="🎮"
          label="Games Played"
          value={gamesPlayedCount}
          color="#14B8A6"
          trend="+12% this week"
          trendUp={true}
        />
        <AnimatedStatCard
          icon="🎯"
          label="Correct Rate"
          value={correctRate}
          suffix="%"
          color="#22C55E"
          trend="+5% this week"
          trendUp={true}
          showProgress={true}
          progressValue={correctRate}
        />
        <AnimatedStatCard
          icon="🪙"
          label="Coins Earned"
          value={totalCoinsCount}
          color="#F59E0B"
          trend="+8% this week"
          trendUp={true}
        />
        <AnimatedStatCard
          icon="🔥"
          label="Best Streak"
          value={bestStreakCount}
          color="#EF4444"
          trend="Keep going!"
          trendUp={false}
        />
      </motion.div>

      {/* ─── 4. Two-Column Layout ─── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left Column — Quick Actions / Teacher Tools */}
        <motion.div variants={itemVariants} className="gf-card p-5 lg:p-6">
          <h2 className="gf-font-display text-lg text-gf-dark mb-4">
            {isTeacher ? '👨‍🏫 Teacher Tools' : '⚡ Quick Actions'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {isTeacher ? (
              <>
                <NewActionCard icon="📡" label="Host Game" desc="Live class quiz" color="#14B8A6" onClick={() => setView('live')} />
                <NewActionCard icon="📝" label="Assign HW" desc="Async practice" color="#3B82F6" onClick={() => setView('homework')} />
                <NewActionCard icon="📚" label="Create Set" desc="Build questions" color="#8B5CF6" onClick={() => setView('create-set')} />
                <NewActionCard icon="📊" label="View Results" desc="Performance" color="#F59E0B" onClick={() => setView('homework')} />
              </>
            ) : (
              <>
                <NewActionCard icon="🎮" label="Play Games" desc="Choose a mode" color="#14B8A6" onClick={() => setView('mode-select')} />
                <NewActionCard icon="📡" label="Join Game" desc="Enter room code" color="#3B82F6" onClick={() => setView('live')} />
                <NewActionCard icon="🛒" label="Shop" desc="Spend your coins" color="#8B5CF6" onClick={() => setView('shop')} />
                <NewActionCard icon="🏆" label="Achievements" desc="Track your goals" color="#F59E0B" onClick={() => setView('achievements')} />
              </>
            )}
          </div>
        </motion.div>

        {/* Right Column — Recent Activity */}
        <motion.div variants={itemVariants} className="gf-card p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="gf-font-display text-lg text-gf-dark">🕐 Recent Games</h2>
            {recentGames.length > 3 && (
              <button className="text-gf-teal font-bold text-xs hover:underline">View All</button>
            )}
          </div>
          {recentGames.length === 0 ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl mb-3"
              >
                🎮
              </motion.div>
              <p className="gf-font-display text-gf-dark/50 text-lg">Play your first game!</p>
              <p className="text-gf-dark/40 text-sm mt-1 font-bold">Choose a game mode above to get started</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('mode-select')}
                className="mt-4 gf-btn text-sm py-2 px-6"
              >
                ▶ Play Now
              </motion.button>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto gf-scrollbar pr-1">
              {recentGames.map((game) => {
                const totalQ = game.correct + game.wrong
                const correctPct = totalQ > 0 ? (game.correct / totalQ) * 100 : 0
                const isHighScore = game.score >= 800
                const isLowScore = game.score < 400
                const modeConfig = getGameMode(game.gameType as GameModeId)
                const modeIcon = modeConfig?.icon || '🎮'

                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gf-light/60 border border-gf-dark/8 hover:border-gf-teal/30 transition-colors"
                  >
                    {/* Mode icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border-2 border-gf-dark/10"
                      style={{ background: `${modeSolidColor[game.gameType] || '#14B8A6'}20` }}
                    >
                      {modeIcon}
                    </div>

                    {/* Game info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gf-dark truncate capitalize">
                          {modeConfig?.name || game.gameType}
                        </p>
                        <span className="text-[10px] bg-gf-dark/8 rounded-full px-2 py-0.5 font-bold text-gf-dark/50">
                          {game.gameType}
                        </span>
                      </div>
                      {/* Mini correct/wrong bar */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 max-w-[100px] h-2 bg-gf-dark/8 rounded-full overflow-hidden">
                          <div className="h-full bg-gf-success rounded-full" style={{ width: `${correctPct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gf-success">{game.correct}✓</span>
                        <span className="text-[10px] font-bold text-gf-danger">{game.wrong}✗</span>
                      </div>
                    </div>

                    {/* Score + time */}
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${isHighScore ? 'text-gf-success' : isLowScore ? 'text-gf-danger' : 'text-gf-dark'}`}>
                        {game.score.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gf-dark/40 font-bold">{timeAgo(game.createdAt)}</p>
                      {game.coinsEarned > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-gf-warning/15 text-gf-warning font-bold rounded-full px-1.5 py-0.5 mt-0.5">
                          🪙 {game.coinsEarned}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ─── 5. Active Homework Section ─── */}
      {homeworks.length > 0 && (
        <motion.div variants={itemVariants} className="gf-card p-5 lg:p-6">
          <h2 className="gf-font-display text-lg text-gf-dark mb-4">
            {isTeacher ? '📋 Assigned Homework' : '📋 Your Assignments'}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 gf-scrollbar">
            {homeworks.slice(0, 5).map(hw => {
              const dueDate = hw.dueDate ? new Date(hw.dueDate) : null
              const now = new Date()
              const isOverdue = dueDate ? dueDate < now : false
              const isDueToday = dueDate ? dueDate.toDateString() === now.toDateString() : false
              const hoursLeft = dueDate ? Math.max(0, Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60))) : null

              return (
                <motion.div
                  key={hw.id}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className="min-w-[220px] sm:min-w-[260px] shrink-0 p-4 rounded-xl bg-gf-light/60 border-2 transition-colors cursor-pointer"
                  style={{
                    borderColor: isOverdue ? '#EF4444' : isDueToday ? '#F59E0B' : '#22C55E',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-gf-dark text-sm truncate pr-2">{hw.title}</h3>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${
                      isOverdue ? 'bg-gf-danger/15 text-gf-danger' : isDueToday ? 'bg-gf-warning/15 text-gf-warning' : 'bg-gf-success/15 text-gf-success'
                    }`}>
                      {isOverdue ? 'OVERDUE' : isDueToday ? 'DUE TODAY' : 'UPCOMING'}
                    </span>
                  </div>
                  {hw.set?.title && (
                    <p className="text-xs text-gf-dark/50 mt-1 font-bold">{hw.set.title}</p>
                  )}
                  {hw.set?.subject && (
                    <p className="text-xs text-gf-dark/40 mt-0.5">{hw.set.subject}</p>
                  )}
                  {dueDate && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs">📅</span>
                      <span className={`text-xs font-bold ${isOverdue ? 'text-gf-danger' : isDueToday ? 'text-gf-warning' : 'text-gf-dark/60'}`}>
                        {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `${hoursLeft}h left`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] bg-gf-dark/8 rounded-full px-2 py-0.5 font-bold text-gf-dark/50">
                      {hw._count?.submissions || 0} submitted
                    </span>
                    <span className="text-[10px] bg-gf-dark/8 rounded-full px-2 py-0.5 font-bold text-gf-dark/50">
                      {hw.mode}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ─── 6. Daily Challenge Banner ─── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gf-warning/10 via-gf-warning/5 to-gf-teal/10 border-2 border-gf-dark/15 p-5 lg:p-6"
      >
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gf-warning/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gf-teal/10 rounded-full" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gf-warning/20 flex items-center justify-center text-2xl border-2 border-gf-warning/30"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🎯
            </motion.div>
            <div>
              <h3 className="gf-font-display text-gf-dark text-base">Daily Challenge</h3>
              <p className="text-gf-dark/60 font-bold text-sm">Answer {dailyGoal} questions correctly today</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Progress bar */}
            <div className="flex-1 sm:w-40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gf-dark/60">{dailyProgress}/{dailyGoal}</span>
                <span className="text-xs font-bold text-gf-warning">🪙 +50</span>
              </div>
              <div className="h-3 bg-gf-dark/8 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-gf-warning to-gf-teal rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyProgressPct}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* GO button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('mode-select')}
              className="gf-btn text-sm py-2 px-5 shrink-0"
            >
              GO ▶
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// New Animated Stat Card
function AnimatedStatCard({ icon, label, value, suffix, color, trend, trendUp, showProgress, progressValue }: {
  icon: string
  label: string
  value: number
  suffix?: string
  color: string
  trend: string
  trendUp: boolean
  showProgress?: boolean
  progressValue?: number
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="gf-card gf-stat-card p-4 lg:p-5 relative overflow-hidden"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* Subtle background accent */}
      <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.06] rounded-full -translate-y-1/3 translate-x-1/3" style={{ background: color }} />

      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 border-gf-dark/10"
          style={{ background: `${color}20` }}
        >
          {icon}
        </div>
        {showProgress && progressValue !== undefined && (
          <div className="relative w-8 h-8">
            <ProgressRing progress={progressValue} size={32} strokeWidth={4} color={color} />
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gf-dark">
              {progressValue}%
            </span>
          </div>
        )}
      </div>
      <p className="gf-font-display text-2xl text-gf-dark">
        {value.toLocaleString()}{suffix || ''}
      </p>
      <p className="text-xs text-gf-dark/60 font-bold mt-0.5">{label}</p>
      <p className={`text-[10px] font-bold mt-1 ${trendUp ? 'text-gf-success' : 'text-gf-dark/40'}`}>
        {trendUp && '↑ '}{trend}
      </p>
    </motion.div>
  )
}

// New Action Card
function NewActionCard({ icon, label, desc, color, onClick }: { icon: string; label: string; desc: string; color: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="p-4 rounded-xl bg-white border-2 border-gf-dark/10 hover:border-gf-teal/40 transition-all text-left group relative overflow-hidden"
      style={{ boxShadow: '0 2px 0 0 rgba(15, 23, 42, 0.08)' }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color}15, transparent 70%)` }}
      />

      <div className="relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-2 border-2 border-gf-dark/10"
          style={{ background: `${color}20` }}
        >
          {icon}
        </div>
        <p className="font-bold text-gf-dark text-sm">{label}</p>
        <p className="text-xs text-gf-dark/45 mt-0.5 font-semibold">{desc}</p>
      </div>
    </motion.button>
  )
}

// ─── Solo Play View ───
function SoloView({ user, setView }: { user: User; setView: (v: View) => void }) {
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null)
  const [gameMode, setGameMode] = useState<GameModeId>('classic')
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    api.get('/api/sets').then(data => {
      setSets(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const startGame = () => {
    if (!selectedSet) return
    setPlaying(true)
  }

  const gameModes = getAllGameModes()

  if (playing && selectedSet) {
    return <GamePlayer
      questions={selectedSet.questions || []}
      mode={gameMode}
      playerName={user.name}
      userId={user.id}
      setId={selectedSet.id}
      onEnd={() => { setPlaying(false); setSelectedSet(null) }}
    />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gf-font-display text-2xl text-gf-dark">🎮 Solo Play</h1>
          <p className="text-gf-dark/60 font-bold">Practice at your own pace</p>
        </div>
        <button onClick={() => setView('home')} className="gf-btn gf-btn-outline text-sm">← Back</button>
      </div>

      {!selectedSet ? (
        <>
          <div className="gf-card p-6">
            <h2 className="gf-font-display text-lg text-gf-dark mb-4">Choose a Question Set</h2>
            {loading ? (
              <div className="text-center py-8 text-gf-dark/40 font-bold">Loading...</div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-3">
                {sets.map(set => (
                  <motion.button
                    key={set.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      api.get(`/api/sets/${set.id}`).then(full => setSelectedSet(full))
                    }}
                    className="p-4 rounded-xl bg-gf-light/50 border-2 border-gf-dark/10 hover:border-gf-teal transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gf-dark">{set.title}</h3>
                      <span className="gf-chip text-xs">{set._count?.questions || 0} Q</span>
                    </div>
                    <p className="text-sm text-gf-dark/50 mt-1">{set.subject} • {set.gradeLevel}</p>
                    {set.description && <p className="text-xs text-gf-dark/40 mt-1">{set.description}</p>}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gf-card p-6">
          <h2 className="gf-font-display text-lg text-gf-dark mb-2">{selectedSet.title}</h2>
          <p className="text-gf-dark/60 font-bold mb-4">{selectedSet.questions?.length} questions</p>

          <div className="mb-6">
            <label className="text-gf-dark font-bold text-sm mb-3 block">Game Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gameModes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setGameMode(m.id)}
                  className={`p-3 rounded-xl font-bold text-sm transition-all border-2 text-left ${
                    gameMode === m.id
                      ? 'bg-gf-teal border-gf-dark text-white'
                      : 'bg-white border-gf-dark/20 text-gf-dark'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  <p className="mt-1 text-xs">{m.name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setSelectedSet(null)} className="gf-btn gf-btn-outline text-sm">← Back</button>
            <button onClick={startGame} className="gf-btn text-sm">🏁 Start Game!</button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Game Player (simplified for now — will port the full WebGL game) ───
function GamePlayer({ questions, mode, playerName, userId, setId, onEnd }: {
  questions: Question[]
  mode: GameModeId
  playerName: string
  userId: string
  setId: string
  onEnd: () => void
}) {
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [coins, setCoins] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [lastAnswer, setLastAnswer] = useState<'correct' | 'wrong' | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [answered, setAnswered] = useState(false)

  // Timer
  useEffect(() => {
    if (gameOver || answered) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer(-1) // timeout
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [currentQ, gameOver, answered])

  const handleAnswer = (idx: number) => {
    if (answered) return
    setAnswered(true)

    const q = questions[currentQ]
    const isCorrect = idx === q.correctIdx

    if (isCorrect) {
      const newStreak = streak + 1
      const points = 50 + newStreak * 25
      setScore(s => s + points)
      setCorrect(c => c + 1)
      setStreak(newStreak)
      setBestStreak(bs => Math.max(bs, newStreak))
      setCoins(c => c + 5)
      setLastAnswer('correct')
    } else {
      setWrong(w => w + 1)
      setStreak(0)
      if (mode === 'classic') {
        setHearts(h => {
          const newH = h - 1
          if (newH <= 0) setGameOver(true)
          return newH
        })
      }
      setLastAnswer('wrong')
    }

    setShowResult(true)
    setTimeout(() => {
      setShowResult(false)
      setLastAnswer(null)
      setAnswered(false)
      setTimeLeft(15)
      if (currentQ + 1 >= questions.length) {
        setGameOver(true)
      } else {
        setCurrentQ(q => q + 1)
      }
    }, 1500)
  }

  // Save result on game over
  useEffect(() => {
    if (gameOver) {
      api.post('/api/game-results', {
        userId,
        gameType: 'solo',
        setId,
        score,
        correct,
        wrong,
        bestStreak,
        coinsEarned: coins,
      }).catch(() => {})
    }
  }, [gameOver])

  const modeConfig = getGameMode(mode)

  if (gameOver) {
    return (
      <div className="gf-card p-8 text-center max-w-lg mx-auto">
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-6xl mb-4">🏁</motion.div>
        <h2 className="gf-font-display text-2xl text-gf-dark mb-4">Game Over!</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-xl bg-gf-light/50">
            <p className="gf-font-display text-2xl text-gf-dark">{score.toLocaleString()}</p>
            <p className="text-xs text-gf-dark/60 font-bold">Score</p>
          </div>
          <div className="p-3 rounded-xl bg-gf-success/20">
            <p className="gf-font-display text-2xl text-gf-dark">{correct}/{correct + wrong}</p>
            <p className="text-xs text-gf-dark/60 font-bold">Correct</p>
          </div>
          <div className="p-3 rounded-xl bg-gf-warning/20">
            <p className="gf-font-display text-2xl text-gf-dark">{bestStreak}</p>
            <p className="text-xs text-gf-dark/60 font-bold">Best Streak</p>
          </div>
          <div className="p-3 rounded-xl bg-gf-purple/20">
            <p className="gf-font-display text-2xl text-gf-dark">🪙 {coins}</p>
            <p className="text-xs text-gf-dark/60 font-bold">Coins Earned</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={onEnd} className="gf-btn text-sm">🏠 Dashboard</button>
          <button onClick={() => {
            setCurrentQ(0); setScore(0); setCorrect(0); setWrong(0); setStreak(0); setBestStreak(0); setHearts(3); setCoins(0); setGameOver(false); setAnswered(false); setTimeLeft(15)
          }} className="gf-btn gf-btn-green text-sm">🔄 Play Again</button>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]
  let choices: string[] = []
  try { choices = JSON.parse(q.choices) } catch { choices = ['A', 'B', 'C', 'D'] }

  const answerColors = ['bg-gf-danger', 'bg-gf-teal', 'bg-gf-success', 'bg-gf-warning']

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* HUD */}
      <div className="gf-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="gf-font-display text-gf-dark">Q{currentQ + 1}/{questions.length}</span>
          <span className="gf-chip">🪙 {coins}</span>
          {modeConfig && <span className="gf-chip">{modeConfig.icon} {modeConfig.name}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="gf-font-display text-gf-dark">{score.toLocaleString()}</span>
          {hearts >= 0 && mode === 'classic' && (
            <span className="text-lg">{Array(Math.max(0, hearts)).fill('❤️').join('')}</span>
          )}
          {streak > 1 && <span className="gf-chip">🔥 {streak}</span>}
        </div>
      </div>

      {/* Timer */}
      <div className="h-2 bg-gf-dark/10 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${(timeLeft / 15) * 100}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${timeLeft > 5 ? 'bg-gf-success' : 'bg-gf-danger'}`}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="gf-card p-6"
        >
          <h2 className="gf-font-display text-xl text-gf-dark mb-6">{q.text}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {choices.map((choice, idx) => (
              <motion.button
                key={idx}
                whileHover={!answered ? { scale: 1.02 } : {}}
                whileTap={!answered ? { scale: 0.98 } : {}}
                onClick={() => handleAnswer(idx)}
                disabled={answered}
                className={`p-4 rounded-xl border-3 font-bold text-white transition-all text-left ${
                  answered && idx === q.correctIdx
                    ? 'bg-gf-success border-gf-dark ring-4 ring-gf-success/30'
                    : answered && lastAnswer === 'wrong' && idx !== q.correctIdx
                    ? 'bg-gf-danger/50 border-gf-dark opacity-50'
                    : answerColors[idx] + ' border-gf-dark hover:shadow-lg'
                }`}
              >
                <span className="text-sm opacity-80 block">{String.fromCharCode(65 + idx)}</span>
                <span className="text-base">{choice}</span>
              </motion.button>
            ))}
          </div>

          {/* Result feedback */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-3 rounded-xl text-center font-bold ${
                  lastAnswer === 'correct' ? 'bg-gf-success/20 text-gf-success' : 'bg-gf-danger/20 text-gf-danger'
                }`}
              >
                {lastAnswer === 'correct' ? '✅ Correct!' : `❌ ${q.explanation || 'The correct answer was ' + choices[q.correctIdx]}`}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Live Game View ───
function LiveView({ user }: { user: User }) {
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [selectedSetId, setSelectedSetId] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState('classic')
  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/sets').then(setSets).catch(() => {})
  }, [])

  const hostGame = async () => {
    if (!selectedSetId) return
    setLoading(true)
    setError('')
    try {
      const result = await api.post('/api/rooms', {
        setId: selectedSetId,
        hostId: user.id,
        mode,
      })
      setRoom(result)
      setRoomCode(result.code)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async () => {
    if (!joinCode) return
    setLoading(true)
    setError('')
    try {
      const result = await api.post(`/api/rooms/${joinCode}`, {
        name: user.name,
        userId: user.id,
      })
      setRoom(result.room)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="gf-font-display text-2xl text-gf-dark">📡 Live Game</h1>

      {!room ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Host a Game */}
          <div className="gf-card p-6">
            <h2 className="gf-font-display text-lg text-gf-dark mb-4">Host a Game</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gf-dark font-bold text-sm mb-1 block">Question Set</label>
                <select
                  value={selectedSetId}
                  onChange={e => setSelectedSetId(e.target.value)}
                  className="gf-input"
                >
                  <option value="">Select a set...</option>
                  {sets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gf-dark font-bold text-sm mb-1 block">Game Mode</label>
                <div className="flex gap-2 flex-wrap">
                  {[{id: 'classic', icon: '📝'}, {id: 'racing', icon: '🏎️'}].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs capitalize transition-all border-2 ${
                        mode === m.id ? 'bg-gf-teal text-white border-gf-dark' : 'bg-white text-gf-dark border-gf-dark/20'
                      }`}
                    >
                      {m.icon} {m.id}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={hostGame} disabled={loading || !selectedSetId} className="gf-btn w-full text-sm">
                {loading ? '⏳' : '🚀 Host Game'}
              </button>
            </div>
          </div>

          {/* Join a Game */}
          <div className="gf-card p-6">
            <h2 className="gf-font-display text-lg text-gf-dark mb-4">Join a Game</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gf-dark font-bold text-sm mb-1 block">Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="gf-input text-center text-2xl tracking-[0.3em]"
                  placeholder="ABC123"
                  maxLength={6}
                />
              </div>
              <button onClick={joinGame} disabled={loading || joinCode.length < 6} className="gf-btn gf-btn-green w-full text-sm">
                {loading ? '⏳' : '🎮 Join Game'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="gf-card p-8 text-center max-w-lg mx-auto">
          <div className="text-6xl mb-4">📡</div>
          <h2 className="gf-font-display text-2xl text-gf-dark mb-2">Room Created!</h2>
          <div className="bg-gf-dark text-white p-4 rounded-2xl inline-block mb-4">
            <p className="text-xs text-gf-teal font-bold mb-1">ROOM CODE</p>
            <p className="gf-font-display text-4xl tracking-[0.2em]">{room.code}</p>
          </div>
          <p className="text-gf-dark/60 font-bold mb-4">Share this code with your students to join!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setRoom(null)} className="gf-btn gf-btn-outline text-sm">← Back</button>
            <button className="gf-btn text-sm">🏁 Start Game</button>
          </div>
        </motion.div>
      )}

      {error && <div className="bg-gf-danger/10 text-gf-danger p-3 rounded-xl font-bold text-sm">{error}</div>}
    </div>
  )
}

// ─── Question Sets View ───
function SetsView({ user, setView }: { user: User; setView: (v: View) => void }) {
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/sets').then(data => { setSets(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const deleteSet = async (id: string) => {
    if (!confirm('Delete this set?')) return
    try {
      await api.del(`/api/sets/${id}`)
      setSets(s => s.filter(set => set.id !== id))
    } catch {}
  }

  const subjectColors: Record<string, string> = {
    Math: 'bg-gf-danger/10 border-gf-danger/30',
    Science: 'bg-gf-success/10 border-gf-success/30',
    History: 'bg-gf-warning/10 border-gf-warning/30',
    English: 'bg-gf-purple/10 border-gf-purple/30',
    Geography: 'bg-gf-teal/10 border-gf-teal/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gf-font-display text-2xl text-gf-dark">📚 Question Sets</h1>
          <p className="text-gf-dark/60 font-bold">{sets.length} sets available</p>
        </div>
        {user.role === 'teacher' && (
          <button onClick={() => setView('create-set')} className="gf-btn text-sm">✨ Create New Set</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gf-dark/40 font-bold">Loading...</div>
      ) : (
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sets.map(set => (
            <motion.div
              key={set.id}
              whileHover={{ y: -2 }}
              className={`gf-card p-5 ${subjectColors[set.subject || ''] || 'border-gf-dark/10'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gf-dark text-lg">{set.title}</h3>
                {set.creatorId === user.id && (
                  <button onClick={() => deleteSet(set.id)} className="text-gf-danger/50 hover:text-gf-danger text-sm">🗑️</button>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                {set.subject && <span className="gf-chip text-xs">{set.subject}</span>}
                {set.gradeLevel && <span className="gf-chip text-xs">{set.gradeLevel}</span>}
                <span className="gf-chip text-xs">{set._count?.questions || 0} Q</span>
              </div>
              {set.description && <p className="text-sm text-gf-dark/50 mb-3">{set.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gf-dark/40">by {set.creator?.name || 'Unknown'}</span>
                {set.isPublic && <span className="gf-chip text-xs bg-gf-success/10">🌐 Public</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Create Set View ───
function CreateSetView({ user, setView }: { user: User; setView: (v: View) => void }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [questions, setQuestions] = useState<{ text: string; choices: string[]; correctIdx: number; explanation: string }[]>([
    { text: '', choices: ['', '', '', ''], correctIdx: 0, explanation: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addQuestion = () => {
    setQuestions([...questions, { text: '', choices: ['', '', '', ''], correctIdx: 0, explanation: '' }])
  }

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions]
    if (field === 'choices') {
      updated[idx].choices = value
    } else {
      (updated[idx] as any)[field] = value
    }
    setQuestions(updated)
  }

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== idx))
  }

  const save = async () => {
    if (!title || questions.some(q => !q.text || q.choices.some(c => !c))) {
      setError('Please fill in all fields')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/sets', {
        title,
        subject,
        gradeLevel,
        description,
        isPublic,
        creatorId: user.id,
        questions: questions.map(q => ({
          text: q.text,
          choices: q.choices,
          correctIdx: q.correctIdx,
          explanation: q.explanation,
        })),
      })
      setView('sets')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="gf-font-display text-2xl text-gf-dark">✨ Create Question Set</h1>
        <button onClick={() => setView('sets')} className="gf-btn gf-btn-outline text-sm">← Back</button>
      </div>

      <div className="gf-card p-6 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <label className="text-gf-dark font-bold text-sm mb-1 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="gf-input" placeholder="e.g. Chapter 5 Quiz" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gf-dark font-bold text-sm mb-1 block">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} className="gf-input">
                <option value="">Select...</option>
                <option>Math</option><option>Science</option><option>History</option>
                <option>English</option><option>Geography</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-gf-dark font-bold text-sm mb-1 block">Grade</label>
              <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="gf-input">
                <option value="">Select...</option>
                <option>6th</option><option>7th</option><option>8th</option>
                <option>9th</option><option>10th</option><option>11th</option><option>12th</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="text-gf-dark font-bold text-sm mb-1 block">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className="gf-input" placeholder="Brief description..." />
        </div>
        <label className="flex items-center gap-2 text-gf-dark font-bold text-sm">
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-4 h-4" />
          Make this set public (other teachers can use it)
        </label>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="gf-font-display text-lg text-gf-dark">Questions ({questions.length})</h2>
          <button onClick={addQuestion} className="gf-btn text-sm">+ Add Question</button>
        </div>

        {questions.map((q, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="gf-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="gf-font-display text-gf-dark">Q{idx + 1}</span>
              <button onClick={() => removeQuestion(idx)} className="text-gf-danger/50 hover:text-gf-danger text-sm">Remove</button>
            </div>
            <input
              value={q.text}
              onChange={e => updateQuestion(idx, 'text', e.target.value)}
              className="gf-input mb-3"
              placeholder="Enter your question..."
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              {q.choices.map((choice, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuestion(idx, 'correctIdx', cIdx)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                      q.correctIdx === cIdx ? 'bg-gf-success border-gf-dark text-white' : 'bg-white border-gf-dark/20 text-gf-dark'
                    }`}
                  >
                    {String.fromCharCode(65 + cIdx)}
                  </button>
                  <input
                    value={choice}
                    onChange={e => {
                      const newChoices = [...q.choices]
                      newChoices[cIdx] = e.target.value
                      updateQuestion(idx, 'choices', newChoices)
                    }}
                    className="gf-input text-sm"
                    placeholder={`Choice ${String.fromCharCode(65 + cIdx)}`}
                  />
                </div>
              ))}
            </div>
            <input
              value={q.explanation}
              onChange={e => updateQuestion(idx, 'explanation', e.target.value)}
              className="gf-input text-sm"
              placeholder="Explanation (optional)..."
            />
          </motion.div>
        ))}
      </div>

      {error && <div className="bg-gf-danger/10 text-gf-danger p-3 rounded-xl font-bold text-sm">{error}</div>}

      <div className="flex gap-3 justify-end">
        <button onClick={() => setView('sets')} className="gf-btn gf-btn-outline text-sm">Cancel</button>
        <button onClick={save} disabled={saving} className="gf-btn text-sm">
          {saving ? '⏳ Saving...' : '💾 Save Set'}
        </button>
      </div>
    </div>
  )
}

// ─── Homework View ───
function HomeworkView({ user }: { user: User }) {
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/homework').then(data => { setHomeworks(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="gf-font-display text-2xl text-gf-dark">📝 Homework</h1>
      {loading ? (
        <div className="text-center py-12 text-gf-dark/40 font-bold">Loading...</div>
      ) : homeworks.length === 0 ? (
        <div className="gf-card p-8 text-center">
          <p className="text-4xl mb-2">📋</p>
          <p className="font-bold text-gf-dark">No homework yet</p>
          <p className="text-sm text-gf-dark/50">{user.role === 'teacher' ? 'Assign your first homework!' : 'Your teacher hasn\'t assigned any homework yet'}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {homeworks.map(hw => (
            <div key={hw.id} className="gf-card p-5">
              <h3 className="font-bold text-gf-dark text-lg">{hw.title}</h3>
              <p className="text-sm text-gf-dark/50 mt-1">{hw.set?.title}</p>
              {hw.dueDate && (
                <p className="text-xs text-gf-danger mt-2 font-bold">📅 Due: {new Date(hw.dueDate).toLocaleDateString()}</p>
              )}
              <div className="flex gap-2 mt-3">
                <span className="gf-chip text-xs">{hw.mode}</span>
                <span className="gf-chip text-xs">{hw._count?.submissions || 0} submitted</span>
              </div>
              {user.role === 'student' && (
                <button className="gf-btn text-sm mt-3 w-full">🚀 Start Homework</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shop View ───
function ShopView({ user }: { user: User }) {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/shop').then(data => { setItems(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const purchase = async (item: ShopItem) => {
    setPurchasing(item.id)
    try {
      await api.post(`/api/shop/${item.id}`, { userId: user.id })
      // Refresh user coins
      setItems(items.map(i => i.id === item.id ? { ...i, _purchased: true } as any : i))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setPurchasing(null)
    }
  }

  const categories = ['all', 'car_skin', 'power_up', 'trail', 'badge']
  const filtered = category === 'all' ? items : items.filter(i => i.category === category)

  const rarityColors: Record<string, string> = {
    common: 'border-gray-300 bg-gray-50',
    rare: 'border-blue-400 bg-blue-50',
    epic: 'border-purple-400 bg-purple-50',
    legendary: 'border-amber-400 bg-amber-50',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gf-font-display text-2xl text-gf-dark">🛒 Shop</h1>
          <p className="text-gf-dark/60 font-bold">Spend your coins on cool stuff!</p>
        </div>
        <div className="gf-chip text-lg">🪙 {user.coins.toLocaleString()}</div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-xl font-bold text-sm capitalize whitespace-nowrap transition-all ${
              category === cat ? 'bg-gf-dark text-white' : 'bg-white text-gf-dark border-2 border-gf-dark/10'
            }`}
          >
            {cat === 'all' ? '🌟 All' : cat === 'car_skin' ? '🏎️ Car Skins' : cat === 'power_up' ? '⚡ Power-Ups' : cat === 'trail' ? '✨ Trails' : '🏅 Badges'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gf-dark/40 font-bold">Loading shop...</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <motion.div
              key={item.id}
              whileHover={{ y: -4 }}
              className={`gf-card p-4 border-2 ${rarityColors[item.rarity]}`}
            >
              <div className="text-center mb-3">
                <span className="text-4xl">{item.icon}</span>
              </div>
              <h3 className="font-bold text-gf-dark text-sm text-center">{item.name}</h3>
              <p className="text-xs text-gf-dark/50 text-center mt-1">{item.description}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full ${
                  item.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' :
                  item.rarity === 'epic' ? 'bg-purple-100 text-purple-700' :
                  item.rarity === 'rare' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{item.rarity}</span>
              </div>
              <button
                onClick={() => purchase(item)}
                disabled={purchasing === item.id || user.coins < item.price}
                className="gf-btn text-xs w-full mt-3 py-2"
              >
                {purchasing === item.id ? '⏳' : `🪙 ${item.price}`}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Achievements View ───
function AchievementsView({ user }: { user: User }) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/achievements'),
      api.get(`/api/achievements/${user.id}`),
    ]).then(([ach, uach]) => {
      setAchievements(ach)
      setUserAchievements(uach)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user.id])

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId))

  const categories = ['gameplay', 'streak', 'collection', 'social']
  const catIcons: Record<string, string> = { gameplay: '🎮', streak: '🔥', collection: '💎', social: '👥' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="gf-font-display text-2xl text-gf-dark">🏆 Achievements</h1>
          <p className="text-gf-dark/60 font-bold">{userAchievements.length}/{achievements.length} unlocked</p>
        </div>
        <div className="gf-card p-3 flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <span className="gf-font-display text-gf-dark">{userAchievements.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="gf-card p-4">
        <div className="h-4 bg-gf-dark/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${achievements.length ? (userAchievements.length / achievements.length) * 100 : 0}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-gf-teal to-gf-blue rounded-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gf-dark/40 font-bold">Loading...</div>
      ) : (
        categories.map(cat => {
          const catAch = achievements.filter(a => a.category === cat)
          if (catAch.length === 0) return null
          return (
            <div key={cat}>
              <h2 className="gf-font-display text-lg text-gf-dark mb-3">{catIcons[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</h2>
              <div className="grid lg:grid-cols-2 gap-3">
                {catAch.map(ach => {
                  const unlocked = unlockedIds.has(ach.id)
                  return (
                    <motion.div
                      key={ach.id}
                      whileHover={{ y: -2 }}
                      className={`gf-card p-4 flex items-center gap-4 ${unlocked ? '' : 'opacity-50 grayscale'}`}
                    >
                      <span className="text-4xl">{unlocked ? ach.icon : '🔒'}</span>
                      <div>
                        <h3 className="font-bold text-gf-dark">{ach.name}</h3>
                        <p className="text-sm text-gf-dark/50">{ach.description}</p>
                        {unlocked && (
                          <p className="text-xs text-gf-success mt-1">✅ Unlocked</p>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Friends View ───
function FriendsView({ user }: { user: User }) {
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get(`/api/friends?userId=${user.id}`).then(data => { setFriends(data); setLoading(false) }).catch(() => setLoading(false))
  }, [user.id])

  return (
    <div className="space-y-6">
      <h1 className="gf-font-display text-2xl text-gf-dark">👥 Friends</h1>

      <div className="gf-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="gf-input flex-1"
            placeholder="Search by name or email..."
          />
          <button className="gf-btn text-sm">🔍 Find</button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gf-dark/40 font-bold">Loading...</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-gf-dark/40">
            <p className="text-4xl mb-2">🤝</p>
            <p className="font-bold">No friends yet</p>
            <p className="text-sm">Search for classmates to add!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend: any) => (
              <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-gf-light/50 border border-gf-dark/10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: friend.avatarColor || '#14B8A6' }}
                  >
                    {friend.name[0].toUpperCase()}
                  </div>
                  <span className="font-bold text-gf-dark">{friend.name}</span>
                </div>
                <button className="gf-btn gf-btn-outline text-xs py-2 px-4">Challenge</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Profile View ───
function ProfileView({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [stats, setStats] = useState<{ gamesPlayed: number; totalCorrect: number; totalWrong: number; totalCoins: number; bestStreak: number } | null>(null)

  useEffect(() => {
    api.get(`/api/game-results?userId=${user.id}`).then((data: GameResult[]) => {
      setStats({
        gamesPlayed: data.length,
        totalCorrect: data.reduce((s, g) => s + g.correct, 0),
        totalWrong: data.reduce((s, g) => s + g.wrong, 0),
        totalCoins: data.reduce((s, g) => s + g.coinsEarned, 0),
        bestStreak: Math.max(0, ...data.map(g => g.bestStreak)),
      })
    }).catch(() => {})
  }, [user.id])

  const accuracy = stats ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalWrong)) * 100) || 0 : 0

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="gf-font-display text-2xl text-gf-dark">⚙️ Profile</h1>

      {/* Profile Card */}
      <div className="gf-card p-6 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white gf-font-display text-3xl mx-auto mb-4"
          style={{ backgroundColor: user.avatarColor || '#14B8A6' }}
        >
          {user.name[0].toUpperCase()}
        </div>
        <h2 className="gf-font-display text-2xl text-gf-dark">{user.name}</h2>
        <p className="text-gf-dark/50 font-bold">{user.email}</p>
        <div className="flex justify-center gap-2 mt-3">
          <span className="gf-chip">{user.role === 'teacher' ? '👩‍🏫 Teacher' : '🎓 Student'}</span>
          <span className="gf-chip">🪙 {user.coins.toLocaleString()}</span>
          <span className="gf-chip">🔥 {user.streak} day streak</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="gf-card p-6">
          <h2 className="gf-font-display text-lg text-gf-dark mb-4">📊 Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-gf-teal/10">
              <p className="gf-font-display text-2xl text-gf-dark">{stats.gamesPlayed}</p>
              <p className="text-xs text-gf-dark/60 font-bold">Games Played</p>
            </div>
            <div className="p-3 rounded-xl bg-gf-success/10">
              <p className="gf-font-display text-2xl text-gf-dark">{accuracy}%</p>
              <p className="text-xs text-gf-dark/60 font-bold">Accuracy</p>
            </div>
            <div className="p-3 rounded-xl bg-gf-warning/10">
              <p className="gf-font-display text-2xl text-gf-dark">{stats.totalCoins.toLocaleString()}</p>
              <p className="text-xs text-gf-dark/60 font-bold">Total Coins</p>
            </div>
            <div className="p-3 rounded-xl bg-gf-danger/10">
              <p className="gf-font-display text-2xl text-gf-dark">{stats.bestStreak}</p>
              <p className="text-xs text-gf-dark/60 font-bold">Best Streak</p>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="gf-card p-6">
        <h2 className="gf-font-display text-lg text-gf-dark mb-4">Account</h2>
        <button onClick={onLogout} className="gf-btn gf-btn-red text-sm">🚪 Sign Out</button>
      </div>
    </div>
  )
}
