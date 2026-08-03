import { GameModeState, GameModeResult, Question, PowerUp } from './types'

export class QuizEngine {
  private state: GameModeState
  private onStateChange: (state: GameModeState) => void
  private timer: ReturnType<typeof setInterval> | null = null
  private timePerQuestion: number

  constructor(
    modeId: GameModeState['modeId'],
    questions: Question[],
    onStateChange: (state: GameModeState) => void,
    timePerQuestion: number = 15,
  ) {
    this.onStateChange = onStateChange
    this.timePerQuestion = timePerQuestion
    this.state = {
      modeId,
      status: 'setup',
      questions,
      currentQuestionIndex: 0,
      score: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      coins: 0,
      timeRemaining: timePerQuestion,
      powerUps: [],
      modeData: { bestStreak: 0 },
    }
  }

  getState(): GameModeState { return this.state }

  start() {
    this.state.status = 'playing'
    this.startTimer()
    this.notify()
  }

  pause() {
    this.state.status = 'paused'
    this.stopTimer()
    this.notify()
  }

  resume() {
    this.state.status = 'playing'
    this.startTimer()
    this.notify()
  }

  answer(choiceIdx: number): { correct: boolean; points: number; coins: number } {
    if (this.state.status !== 'playing') return { correct: false, points: 0, coins: 0 }

    const question = this.state.questions[this.state.currentQuestionIndex]
    if (!question) return { correct: false, points: 0, coins: 0 }

    const isCorrect = choiceIdx === question.correctIdx

    if (isCorrect) {
      this.state.correct++
      this.state.streak++
      const bestStreak = Math.max(this.state.modeData.bestStreak ?? 0, this.state.streak)
      this.state.modeData.bestStreak = bestStreak
      const timeBonus = Math.max(0, (this.state.timeRemaining ?? 0) * 2)
      const streakBonus = Math.min(this.state.streak, 5) * 10
      const points = 100 + timeBonus + streakBonus
      const coins = 10 + Math.floor(this.state.streak * 2)
      this.state.score += points
      this.state.coins += coins
      this.notify()
      return { correct: true, points, coins }
    } else {
      this.state.wrong++
      this.state.streak = 0
      this.notify()
      return { correct: false, points: 0, coins: 0 }
    }
  }

  nextQuestion(): boolean {
    this.state.currentQuestionIndex++
    this.stopTimer()

    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      this.state.status = 'ended'
      this.notify()
      return false
    }

    // Reset timer for next question
    this.state.timeRemaining = this.timePerQuestion
    this.startTimer()
    this.notify()
    return true
  }

  usePowerUp(powerUpId: string): boolean {
    const idx = this.state.powerUps.findIndex(p => p.id === powerUpId)
    if (idx === -1 || this.state.powerUps[idx].quantity <= 0) return false
    this.state.powerUps[idx].quantity--
    this.notify()
    return true
  }

  addPowerUp(powerUp: PowerUp) {
    const existing = this.state.powerUps.find(p => p.id === powerUp.id)
    if (existing) {
      existing.quantity += powerUp.quantity
    } else {
      this.state.powerUps.push({ ...powerUp })
    }
    this.notify()
  }

  getResult(): GameModeResult {
    return {
      modeId: this.state.modeId,
      score: this.state.score,
      correct: this.state.correct,
      wrong: this.state.wrong,
      bestStreak: this.state.modeData.bestStreak ?? this.state.streak,
      coinsEarned: this.state.coins,
      duration: 0, // filled by caller
      modeData: this.state.modeData,
    }
  }

  updateModeData(data: Record<string, any>) {
    this.state.modeData = { ...this.state.modeData, ...data }
    this.notify()
  }

  private startTimer() {
    this.stopTimer()
    this.timer = setInterval(() => {
      if (this.state.timeRemaining !== null && this.state.timeRemaining > 0) {
        this.state.timeRemaining--
        this.notify()
      } else {
        // Time's up — auto wrong answer
        this.state.wrong++
        this.state.streak = 0
        this.stopTimer()
        this.notify()
      }
    }, 1000)
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private notify() {
    this.onStateChange({ ...this.state })
  }

  destroy() {
    this.stopTimer()
  }
}
