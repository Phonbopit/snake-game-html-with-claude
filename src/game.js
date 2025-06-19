import { UI } from './ui.js'
import { PowerUps } from './powerups.js'
import { AI } from './ai.js'

export class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas')
    this.ctx = this.canvas.getContext('2d')
    this.gameOverElement = document.getElementById('gameOver')

    this.gridSize = 20
    this.tileCount = this.canvas.width / this.gridSize

    // Game state
    this.snake = [{ x: 10, y: 10 }]
    this.food = { x: 15, y: 15 }
    this.dx = 0
    this.dy = 0
    this.score = 0
    this.isRunning = false
    this.isPaused = false
    this.animationId = null

    // Animation variables
    this.lastUpdateTime = 0
    this.targetFPS = 10
    this.frameInterval = 1000 / this.targetFPS

    // Food animation
    this.foodPulse = 0
    this.foodRotation = 0

    // Particle system
    this.particles = []

    // Settings
    this.settings = {
      theme: 'default',
      difficulty: 'easy',
      soundEnabled: true,
      gameSize: 'medium',
      aiEnabled: false,
      aiDifficulty: 'easy'
    }

    // Audio
    this.audioContext = null

    // Initialize modules
    this.ui = new UI(this)
    this.powerUps = new PowerUps(this)
    this.ai = new AI(this)

    // Bind events
    this.bindEvents()
  }

  init() {
    // Load saved settings
    const savedSettings = localStorage.getItem('snakeGameSettings')
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) }
      document.body.setAttribute('data-theme', this.settings.theme)
      this.updateGameSpeed()
      this.updateGameSize()
      this.ai.enabled = this.settings.aiEnabled
      this.ai.difficulty = this.settings.aiDifficulty
      this.ui.updateAIDisplay()
    }

    // Initialize audio
    this.initAudio()
    
    // Initialize UI
    this.ui.updateGameButtons()
  }

  bindEvents() {
    document.addEventListener('keydown', (event) => {
      // Check if score input modal is open
      const scoreModal = document.getElementById('scoreInputModal')
      if (scoreModal && scoreModal.style.display === 'block') {
        return
      }
      
      // Allow spacebar to toggle pause
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        if (this.isRunning) {
          this.togglePause()
        }
        return
      }
      
      // Don't process arrow keys if game is paused
      if (this.isPaused) return
      
      event.preventDefault()
      if (event.key === 'ArrowUp') {
        if (this.dy !== 1) {
          this.dy = -1
          this.dx = 0
        }
      } else if (event.key === 'ArrowDown') {
        if (this.dy !== -1) {
          this.dy = 1
          this.dx = 0
        }
      } else if (event.key === 'ArrowLeft') {
        if (this.dx !== 1) {
          this.dx = -1
          this.dy = 0
        }
      } else if (event.key === 'ArrowRight') {
        if (this.dx !== -1) {
          this.dx = 1
          this.dy = 0
        }
      }
    })
  }

  start() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    this.initializeGameState()
    this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp))
  }

  initializeGameState() {
    this.resetGame()
    this.generateFood()

    this.gameOverElement.style.display = 'none'
    this.isRunning = true
    this.isPaused = false
    this.ui.updateScore()
    this.ui.updateGameButtons()
  }

  resetGame() {
    this.snake = [{ x: 10, y: 10 }]
    this.dx = 0
    this.dy = 0
    this.score = 0
    
    // Reset AI
    this.ai.reset()
    
    // Reset power-ups
    this.powerUps.powerUp = null
    this.powerUps.activePowerUps = []
    
    // Reset particles
    this.particles = []
  }

  togglePause() {
    if (!this.isRunning) return
    
    this.isPaused = !this.isPaused
    this.ui.updateGameButtons()
  }

  gameLoop(timestamp) {
    if (!this.isRunning || this.isPaused) {
      if (!this.isRunning) return
      // If paused, still draw but don't update game state
      if (this.isPaused) {
        this.draw()
        this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp))
        return
      }
    }

    const deltaTime = timestamp - this.lastUpdateTime
    if (deltaTime >= this.frameInterval) {
      // Update power-up effects
      this.powerUps.updateEffects()
      
      this.moveSnake()
      
      if (this.checkCollision()) {
        this.gameOver()
        return
      }
      
      this.draw()
      this.lastUpdateTime = timestamp
    }

    this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp))
  }

  moveSnake() {
    // Move player snake
    const head = {
      x: this.snake[0].x + this.dx,
      y: this.snake[0].y + this.dy,
    }

    this.snake.unshift(head)

    let foodEaten = this.checkFoodCollision()
    let powerUpEaten = this.powerUps.checkCollision()

    if (!foodEaten && !powerUpEaten) {
      this.snake.pop()
    }
    
    // Move AI snake if enabled
    if (this.ai.enabled) {
      this.ai.move()
    }
  }

  checkFoodCollision() {
    const head = this.snake[0]

    if (head.x === this.food.x && head.y === this.food.y) {
      // Score based on difficulty level
      let scoreToAdd
      switch (this.settings.difficulty) {
        case 'easy':
          scoreToAdd = 1
          break
        case 'medium':
          scoreToAdd = 2
          break
        case 'hard':
          scoreToAdd = 3
          break
        default:
          scoreToAdd = 1
      }
      
      // Apply double score power-up
      if (this.powerUps.hasActivePowerUp('DOUBLE_SCORE')) {
        scoreToAdd *= 2
      }
      
      this.score += scoreToAdd
      
      // Create particles at food position
      this.createParticles(
        this.food.x * this.gridSize + this.gridSize / 2,
        this.food.y * this.gridSize + this.gridSize / 2
      )

      // Play eat sound
      this.playEatSound()

      this.ui.updateScore()
      this.generateFood()

      return true
    }

    return false
  }

  generateFood() {
    let attempts = 0
    const maxAttempts = 100
    
    do {
      this.food = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount),
      }
      attempts++
    } while (
      attempts < maxAttempts &&
      (this.snake.some(body => body.x === this.food.x && body.y === this.food.y) ||
       (this.ai.enabled && this.ai.snake.some(body => body.x === this.food.x && body.y === this.food.y)) ||
       (this.powerUps.powerUp && this.powerUps.powerUp.x === this.food.x && this.powerUps.powerUp.y === this.food.y))
    )
    
    // 30% chance to spawn power-up after eating food
    if (Math.random() < 0.3 && !this.powerUps.powerUp) {
      this.powerUps.generatePowerUp()
    }
  }

  checkCollision() {
    const head = this.snake[0]
    const hasShield = this.powerUps.hasActivePowerUp('SHIELD')

    // Wall collision
    if (
      head.x < 0 ||
      head.x >= this.tileCount ||
      head.y < 0 ||
      head.y >= this.tileCount
    ) {
      if (hasShield) {
        // Remove shield and prevent collision once
        this.powerUps.activePowerUps = this.powerUps.activePowerUps.filter(effect => effect.type !== 'SHIELD')
        this.playPowerUpSound()
        return false
      }
      return true
    }

    // Self collision
    for (let body of this.snake.slice(1)) {
      if (head.x === body.x && head.y === body.y) {
        if (hasShield) {
          // Remove shield and prevent collision once
          this.powerUps.activePowerUps = this.powerUps.activePowerUps.filter(effect => effect.type !== 'SHIELD')
          this.playPowerUpSound()
          return false
        }
        return true
      }
    }

    return false
  }

  gameOver() {
    this.isRunning = false
    this.isPaused = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    
    // Play game over sound
    this.playGameOverSound()
    
    // Check if this is a high score BEFORE resetting
    this.ui.checkHighScore()
    
    this.gameOverElement.style.display = 'block'
    this.ui.updateGameButtons()
  }

  draw() {
    this.clearCanvas()
    this.drawSnake()
    this.drawFood()
    this.powerUps.draw(this.ctx)
    this.updateParticles()
    
    // Draw pause overlay if game is paused
    if (this.isPaused) {
      this.drawPauseOverlay()
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Draw subtle grid pattern
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    this.ctx.lineWidth = 1
    
    for (let i = 0; i <= this.canvas.width; i += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(i, 0)
      this.ctx.lineTo(i, this.canvas.height)
      this.ctx.stroke()
    }
    
    for (let i = 0; i <= this.canvas.height; i += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, i)
      this.ctx.lineTo(this.canvas.width, i)
      this.ctx.stroke()
    }
  }

  drawSnake() {
    const isInvisible = this.powerUps.hasActivePowerUp('INVISIBLE')
    const hasShield = this.powerUps.hasActivePowerUp('SHIELD')
    
    // Draw player snake
    this.drawSnakeSegments(this.snake, false, isInvisible, hasShield)
    
    // Draw AI snake if enabled
    if (this.ai.enabled) {
      this.ai.draw(this.ctx)
    }
  }

  drawSnakeSegments(snakeArray, isAI, isInvisible, hasShield) {
    snakeArray.forEach((segment, index) => {
      const x = segment.x * this.gridSize
      const y = segment.y * this.gridSize
      const isHead = index === 0
      const radius = 4
      
      // Skip drawing if invisible (except head which should blink)
      if (isInvisible && !isHead) return
      if (isInvisible && isHead && Math.floor(Date.now() / 200) % 2 === 0) return
      
      this.ctx.save()
      
      // Get theme colors
      const colors = this.getThemeColors()
      
      // Shield effect
      if (hasShield && isHead) {
        this.ctx.shadowColor = '#32CD32'
        this.ctx.shadowBlur = 10
      }
      
      // Create gradient for snake segments
      const gradient = this.ctx.createLinearGradient(x, y, x + this.gridSize, y + this.gridSize)
      
      if (isAI) {
        // AI snake colors (red theme)
        if (isHead) {
          gradient.addColorStop(0, '#FF6B6B')
          gradient.addColorStop(0.6, '#FF5252')
          gradient.addColorStop(1, '#F44336')
        } else {
          gradient.addColorStop(0, '#FF5252')
          gradient.addColorStop(0.6, '#F44336')
          gradient.addColorStop(1, '#D32F2F')
        }
      } else {
        // Player snake colors
        if (isHead) {
          // Head gradient using theme colors
          gradient.addColorStop(0, colors.snakeHeadPrimary)
          gradient.addColorStop(0.6, colors.snakeHeadSecondary)
          gradient.addColorStop(1, colors.snakeHeadTertiary)
        } else {
          // Body gradient using theme colors
          gradient.addColorStop(0, colors.snakeBodyPrimary)
          gradient.addColorStop(0.6, colors.snakeBodySecondary)
          gradient.addColorStop(1, colors.snakeBodyTertiary)
        }
      }
      
      this.ctx.fillStyle = gradient
      
      // Apply transparency for invisible effect
      if (isInvisible) {
        this.ctx.globalAlpha = 0.3
      }
      
      // Draw rounded rectangle for snake segments
      this.ctx.beginPath()
      this.ctx.roundRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2, radius)
      this.ctx.fill()
      
      // Add border for better definition
      if (isAI) {
        this.ctx.strokeStyle = isHead ? '#B71C1C' : '#D32F2F'
      } else {
        this.ctx.strokeStyle = isHead ? colors.snakeBorderHead : colors.snakeBorderBody
      }
      this.ctx.lineWidth = isHead ? 2 : 1
      this.ctx.stroke()
      
      // Draw shield border
      if (hasShield && isHead) {
        this.ctx.strokeStyle = '#32CD32'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
      }
      
      // Draw eyes for the head
      if (isHead) {
        const eyeSize = 2
        const eyeOffset = 5
        
        this.ctx.fillStyle = '#ffffff'
        // Left eye - square
        this.ctx.fillRect(x + eyeOffset - 1, y + eyeOffset - 1, eyeSize + 1, eyeSize + 1)
        
        // Right eye - square
        this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + eyeOffset - 1, eyeSize + 1, eyeSize + 1)
        
        // Eye pupils - square
        this.ctx.fillStyle = '#000000'
        this.ctx.fillRect(x + eyeOffset, y + eyeOffset, 1, 1)
        this.ctx.fillRect(x + this.gridSize - eyeOffset - 1, y + eyeOffset, 1, 1)
      }
      
      this.ctx.restore()
    })
  }

  drawFood() {
    const centerX = this.food.x * this.gridSize + this.gridSize / 2
    const centerY = this.food.y * this.gridSize + this.gridSize / 2
    const baseRadius = this.gridSize / 2 - 2
    
    // Get theme colors
    const colors = this.getThemeColors()
    
    // Update animation variables
    this.foodPulse += 0.1
    this.foodRotation += 0.05
    
    // Pulsing effect
    const pulseScale = 1 + Math.sin(this.foodPulse) * 0.1
    const radius = baseRadius * pulseScale
    
    // Save context for rotation
    this.ctx.save()
    this.ctx.translate(centerX, centerY)
    this.ctx.rotate(this.foodRotation)
    
    // Draw shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.beginPath()
    this.ctx.arc(2, 2, radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Create radial gradient for apple-like appearance using theme colors
    const gradient = this.ctx.createRadialGradient(
      -radius/3, -radius/3, 0,
      0, 0, radius
    )
    gradient.addColorStop(0, colors.foodPrimary)
    gradient.addColorStop(0.3, colors.foodSecondary)
    gradient.addColorStop(0.7, colors.foodTertiary)
    gradient.addColorStop(1, colors.foodQuaternary)
    
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Add highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    this.ctx.beginPath()
    this.ctx.arc(-radius/3, -radius/3, radius/3, 0, Math.PI * 2)
    this.ctx.fill()
    
    // Draw stem
    this.ctx.fillStyle = '#8b4513'
    this.ctx.fillRect(-1, -radius - 4, 2, 6)
    
    // Draw leaf
    this.ctx.fillStyle = '#32cd32'
    this.ctx.beginPath()
    this.ctx.ellipse(3, -radius - 2, 4, 2, Math.PI/4, 0, Math.PI * 2)
    this.ctx.fill()
    
    this.ctx.restore()
    
    // Add sparkle effect
    const sparkleRadius = radius + 5
    for (let i = 0; i < 3; i++) {
      const angle = this.foodRotation + (i * Math.PI * 2 / 3)
      const sparkleX = centerX + Math.cos(angle) * sparkleRadius
      const sparkleY = centerY + Math.sin(angle) * sparkleRadius
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(this.foodPulse + i) * 0.3})`
      this.ctx.beginPath()
      this.ctx.arc(sparkleX, sparkleY, 1, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawPauseOverlay() {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Pause text
    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 48px Itim, cursive'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    // Add text shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    this.ctx.shadowBlur = 10
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2
    
    this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 20)
    
    // Instruction text
    this.ctx.font = '20px Itim, cursive'
    this.ctx.fillText('กด SPACE หรือ Resume เพื่อเล่นต่อ', this.canvas.width / 2, this.canvas.height / 2 + 20)
    
    // Reset shadow
    this.ctx.shadowColor = 'transparent'
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0
  }

  createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1.0,
        color: `hsl(${Math.random() * 60 + 120}, 70%, 60%)`
      })
    }
  }

  updateParticles() {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life -= 0.02
      particle.vy += 0.1 // gravity
      
      if (particle.life > 0) {
        this.ctx.save()
        this.ctx.globalAlpha = particle.life
        this.ctx.fillStyle = particle.color
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.restore()
        return true
      }
      return false
    })
  }

  updateGameSpeed() {
    switch (this.settings.difficulty) {
      case 'easy':
        this.targetFPS = 8
        break
      case 'medium':
        this.targetFPS = 12
        break
      case 'hard':
        this.targetFPS = 18
        break
    }
    this.frameInterval = 1000 / this.targetFPS
  }

  updateGameSize() {
    let newSize
    switch (this.settings.gameSize) {
      case 'small':
        newSize = 300
        break
      case 'medium':
        newSize = 400
        break
      case 'large':
        newSize = 500
        break
      default:
        newSize = 400
    }
    
    this.canvas.width = newSize
    this.canvas.height = newSize
    this.tileCount = newSize / this.gridSize
    
    // Reset game state if game size changed during gameplay
    if (this.isRunning) {
      // Restart the game with new size
      this.start()
    }
  }

  getThemeColors() {
    // Force recompute of CSS variables based on current theme
    const computedStyle = getComputedStyle(document.body)
    
    return {
      snakeHeadPrimary: computedStyle.getPropertyValue('--snake-head-primary').trim(),
      snakeHeadSecondary: computedStyle.getPropertyValue('--snake-head-secondary').trim(),
      snakeHeadTertiary: computedStyle.getPropertyValue('--snake-head-tertiary').trim(),
      snakeBodyPrimary: computedStyle.getPropertyValue('--snake-body-primary').trim(),
      snakeBodySecondary: computedStyle.getPropertyValue('--snake-body-secondary').trim(),
      snakeBodyTertiary: computedStyle.getPropertyValue('--snake-body-tertiary').trim(),
      snakeBorderHead: computedStyle.getPropertyValue('--snake-border-head').trim(),
      snakeBorderBody: computedStyle.getPropertyValue('--snake-border-body').trim(),
      foodPrimary: computedStyle.getPropertyValue('--food-primary').trim(),
      foodSecondary: computedStyle.getPropertyValue('--food-secondary').trim(),
      foodTertiary: computedStyle.getPropertyValue('--food-tertiary').trim(),
      foodQuaternary: computedStyle.getPropertyValue('--food-quaternary').trim()
    }
  }

  // Audio Functions
  initAudio() {
    if (!this.settings.soundEnabled) return
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.log('Audio not supported')
    }
  }

  playEatSound() {
    if (!this.settings.soundEnabled || !this.audioContext) return
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  playGameOverSound() {
    if (!this.settings.soundEnabled || !this.audioContext) return
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.5)
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.5)
  }

  playPowerUpSound() {
    if (!this.settings.soundEnabled || !this.audioContext) return
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 0.1)
    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2)
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.2)
  }
}