const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')
const playerScoreElement = document.getElementById('playerScore')
const aiScoreElement = document.getElementById('aiScore')
const gameOverElement = document.getElementById('gameOver')

const gridSize = 20
let tileCount = canvas.width / gridSize

let snake = [{ x: 10, y: 10 }]
let aiSnake = [{ x: 5, y: 5 }]
let aiDx = 0
let aiDy = 0
let aiScore = 0
let aiLastDirection = null

let food = { x: 15, y: 15 }
let powerUp = null
let activePowerUps = []

let dx = 0
let dy = 0

let score = 0
let isGameRunning = true
let isPaused = false
let animationId = null

let lastUpdateTime = 0
let targetFPS = 10
let frameInterval = 1000 / targetFPS // 100ms

// Animation variables for food
let foodPulse = 0
let foodRotation = 0

// Particle system for eating effects
let particles = []

// Settings
let gameSettings = {
  theme: 'default',
  difficulty: 'easy',
  soundEnabled: true,
  gameSize: 'medium',
  aiEnabled: false,
  aiDifficulty: 'easy'
}

// Scoreboard
let scoreboard = []

// Power-up types
const POWER_UP_TYPES = {
  DOUBLE_SCORE: {
    name: 'Double Score',
    emoji: '💎',
    color: '#FFD700',
    duration: 10000, // 10 seconds
    description: 'คะแนนเพิ่มเป็น 2 เท่า'
  },
  SLOW_MOTION: {
    name: 'Slow Motion',
    emoji: '🐌',
    color: '#87CEEB',
    duration: 8000, // 8 seconds
    description: 'เคลื่อนที่ช้าลง'
  },
  INVISIBLE: {
    name: 'Invisible',
    emoji: '👻',
    color: '#DDA0DD',
    duration: 5000, // 5 seconds
    description: 'งูกลายร่างซ่อนตัว'
  },
  MEGA_FOOD: {
    name: 'Mega Food',
    emoji: '🍎',
    color: '#FF6347',
    duration: 0, // instant
    description: 'คะแนน +5 และงูยาวขึ้น 3 ช่วง'
  },
  SHRINK: {
    name: 'Shrink',
    emoji: '🔥',
    color: '#FF4500',
    duration: 0, // instant
    description: 'งูสั้นลง 2 ช่วง'
  },
  SHIELD: {
    name: 'Shield',
    emoji: '🛡️',
    color: '#32CD32',
    duration: 15000, // 15 seconds
    description: 'ป้องกันการชนผนังครั้งแรก'
  }
}

// Sound effects
let audioContext = null
let soundBuffer = null

// Theme colors cache
let themeColors = {}

function drawSnake() {
  const isInvisible = hasActivePowerUp('INVISIBLE')
  const hasShield = hasActivePowerUp('SHIELD')
  
  // Draw player snake
  drawSnakeSegments(snake, false, isInvisible, hasShield)
  
  // Draw AI snake if enabled
  if (gameSettings.aiEnabled) {
    drawSnakeSegments(aiSnake, true, false, false)
  }
}

function drawSnakeSegments(snakeArray, isAI, isInvisible, hasShield) {
  snakeArray.forEach((segment, index) => {
    const x = segment.x * gridSize
    const y = segment.y * gridSize
    const isHead = index === 0
    const radius = 4
    
    // Skip drawing if invisible (except head which should blink)
    if (isInvisible && !isHead) return
    if (isInvisible && isHead && Math.floor(Date.now() / 200) % 2 === 0) return
    
    ctx.save()
    
    // Get theme colors
    const colors = getThemeColors()
    
    // Shield effect
    if (hasShield && isHead) {
      ctx.shadowColor = '#32CD32'
      ctx.shadowBlur = 10
    }
    
    // Create gradient for snake segments
    const gradient = ctx.createLinearGradient(x, y, x + gridSize, y + gridSize)
    
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
    
    ctx.fillStyle = gradient
    
    // Apply transparency for invisible effect
    if (isInvisible) {
      ctx.globalAlpha = 0.3
    }
    
    // Draw rounded rectangle for snake segments
    ctx.beginPath()
    ctx.roundRect(x + 1, y + 1, gridSize - 2, gridSize - 2, radius)
    ctx.fill()
    
    // Add border for better definition
    if (isAI) {
      ctx.strokeStyle = isHead ? '#B71C1C' : '#D32F2F'
    } else {
      ctx.strokeStyle = isHead ? colors.snakeBorderHead : colors.snakeBorderBody
    }
    ctx.lineWidth = isHead ? 2 : 1
    ctx.stroke()
    
    // Draw shield border
    if (hasShield && isHead) {
      ctx.strokeStyle = '#32CD32'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    
    // Draw eyes for the head
    if (isHead) {
      const eyeSize = 2
      const eyeOffset = 5
      
      ctx.fillStyle = '#ffffff'
      // Left eye - square
      ctx.fillRect(x + eyeOffset - 1, y + eyeOffset - 1, eyeSize + 1, eyeSize + 1)
      
      // Right eye - square
      ctx.fillRect(x + gridSize - eyeOffset - eyeSize, y + eyeOffset - 1, eyeSize + 1, eyeSize + 1)
      
      // Eye pupils - square
      ctx.fillStyle = '#000000'
      ctx.fillRect(x + eyeOffset, y + eyeOffset, 1, 1)
      ctx.fillRect(x + gridSize - eyeOffset - 1, y + eyeOffset, 1, 1)
    }
    
    ctx.restore()
  })
}

function drawFood() {
  const centerX = food.x * gridSize + gridSize / 2
  const centerY = food.y * gridSize + gridSize / 2
  const baseRadius = gridSize / 2 - 2
  
  // Get theme colors
  const colors = getThemeColors()
  
  // Update animation variables
  foodPulse += 0.1
  foodRotation += 0.05
  
  // Pulsing effect
  const pulseScale = 1 + Math.sin(foodPulse) * 0.1
  const radius = baseRadius * pulseScale
  
  // Save context for rotation
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(foodRotation)
  
  // Draw shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.beginPath()
  ctx.arc(2, 2, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // Create radial gradient for apple-like appearance using theme colors
  const gradient = ctx.createRadialGradient(
    -radius/3, -radius/3, 0,
    0, 0, radius
  )
  gradient.addColorStop(0, colors.foodPrimary)
  gradient.addColorStop(0.3, colors.foodSecondary)
  gradient.addColorStop(0.7, colors.foodTertiary)
  gradient.addColorStop(1, colors.foodQuaternary)
  
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // Add highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.beginPath()
  ctx.arc(-radius/3, -radius/3, radius/3, 0, Math.PI * 2)
  ctx.fill()
  
  // Draw stem
  ctx.fillStyle = '#8b4513'
  ctx.fillRect(-1, -radius - 4, 2, 6)
  
  // Draw leaf
  ctx.fillStyle = '#32cd32'
  ctx.beginPath()
  ctx.ellipse(3, -radius - 2, 4, 2, Math.PI/4, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
  
  // Add sparkle effect
  const sparkleRadius = radius + 5
  for (let i = 0; i < 3; i++) {
    const angle = foodRotation + (i * Math.PI * 2 / 3)
    const sparkleX = centerX + Math.cos(angle) * sparkleRadius
    const sparkleY = centerY + Math.sin(angle) * sparkleRadius
    
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(foodPulse + i) * 0.3})`
    ctx.beginPath()
    ctx.arc(sparkleX, sparkleY, 1, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPowerUp() {
  if (!powerUp) return
  
  const powerUpInfo = POWER_UP_TYPES[powerUp.type]
  const centerX = powerUp.x * gridSize + gridSize / 2
  const centerY = powerUp.y * gridSize + gridSize / 2
  const baseRadius = gridSize / 2 - 1
  
  // Pulsing animation
  const timeSinceSpawn = Date.now() - powerUp.spawnTime
  const pulseScale = 1 + Math.sin(timeSinceSpawn * 0.008) * 0.2
  const radius = baseRadius * pulseScale
  
  // Draw glow effect
  ctx.save()
  ctx.shadowColor = powerUpInfo.color
  ctx.shadowBlur = 15
  
  // Draw background circle
  ctx.fillStyle = powerUpInfo.color
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.globalAlpha = 1
  ctx.shadowBlur = 8
  
  // Draw main power-up circle
  const gradient = ctx.createRadialGradient(centerX - 3, centerY - 3, 0, centerX, centerY, radius)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.4, powerUpInfo.color)
  gradient.addColorStop(1, '#333333')
  
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // Draw emoji
  ctx.shadowBlur = 0
  ctx.font = `${gridSize * 0.6}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(powerUpInfo.emoji, centerX, centerY)
  
  ctx.restore()
  
  // Draw border
  ctx.strokeStyle = powerUpInfo.color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.stroke()
}

function drawPowerUpEffects() {
  // Draw active power-up indicators
  if (activePowerUps.length > 0) {
    ctx.save()
    ctx.font = '14px Itim, cursive'
    ctx.textAlign = 'left'
    
    activePowerUps.forEach((effect, index) => {
      const powerUpInfo = POWER_UP_TYPES[effect.type]
      const y = 10 + (index * 25)
      const timeLeft = Math.max(0, (effect.endTime - Date.now()) / 1000)
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(5, y - 10, 120, 20)
      
      // Icon
      ctx.fillStyle = powerUpInfo.color
      ctx.fillText(powerUpInfo.emoji, 10, y)
      
      // Timer
      ctx.fillStyle = '#fff'
      ctx.fillText(`${timeLeft.toFixed(1)}s`, 30, y)
      
      // Effect name
      ctx.fillStyle = powerUpInfo.color
      ctx.fillText(powerUpInfo.name, 70, y)
    })
    
    ctx.restore()
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Draw subtle grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.lineWidth = 1
  
  for (let i = 0; i <= canvas.width; i += gridSize) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, canvas.height)
    ctx.stroke()
  }
  
  for (let i = 0; i <= canvas.height; i += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(canvas.width, i)
    ctx.stroke()
  }
}

function createParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1.0,
      color: `hsl(${Math.random() * 60 + 120}, 70%, 60%)`
    })
  }
}

function updateParticles() {
  particles = particles.filter(particle => {
    particle.x += particle.vx
    particle.y += particle.vy
    particle.life -= 0.02
    particle.vy += 0.1 // gravity
    
    if (particle.life > 0) {
      ctx.save()
      ctx.globalAlpha = particle.life
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return true
    }
    return false
  })
}

function moveSnake() {
  // Move player snake
  const head = {
    x: snake[0].x + dx,
    y: snake[0].y + dy,
  }

  snake.unshift(head)

  let foodEaten = checkFoodCollision()
  let powerUpEaten = checkPowerUpCollision()

  if (!foodEaten && !powerUpEaten) {
    snake.pop()
  }
  
  // Move AI snake if enabled
  if (gameSettings.aiEnabled) {
    moveAISnake()
  }
}

function moveAISnake() {
  // Get AI direction using greedy algorithm
  const aiDirection = getAIDirection()
  aiDx = aiDirection.dx
  aiDy = aiDirection.dy
  
  const aiHead = {
    x: aiSnake[0].x + aiDx,
    y: aiSnake[0].y + aiDy,
  }

  aiSnake.unshift(aiHead)

  let aiFoodEaten = checkAIFoodCollision()
  let aiPowerUpEaten = checkAIPowerUpCollision()

  if (!aiFoodEaten && !aiPowerUpEaten) {
    aiSnake.pop()
  }
}

function checkFoodCollision() {
  const head = snake[0]

  // งูกินอาหาร
  if (head.x === food.x && head.y === food.y) {
    // Score based on difficulty level
    let scoreToAdd
    switch (gameSettings.difficulty) {
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
    if (hasActivePowerUp('DOUBLE_SCORE')) {
      scoreToAdd *= 2
    }
    
    score += scoreToAdd
    
    // Create particles at food position
    createParticles(
      food.x * gridSize + gridSize / 2,
      food.y * gridSize + gridSize / 2
    )

    // Play eat sound
    playEatSound()

    updateScore()
    generateFood()

    return true
  }

  return false
}

function checkPowerUpCollision() {
  if (!powerUp) return false
  
  const head = snake[0]
  
  if (head.x === powerUp.x && head.y === powerUp.y) {
    applyPowerUp(powerUp.type)
    powerUp = null
    return true
  }
  
  return false
}

function applyPowerUp(type) {
  const powerUpInfo = POWER_UP_TYPES[type]
  
  switch (type) {
    case 'DOUBLE_SCORE':
      activePowerUps.push({
        type: type,
        endTime: Date.now() + powerUpInfo.duration
      })
      break
      
    case 'SLOW_MOTION':
      activePowerUps.push({
        type: type,
        endTime: Date.now() + powerUpInfo.duration,
        originalFPS: targetFPS
      })
      targetFPS = Math.max(3, targetFPS * 0.5)
      frameInterval = 1000 / targetFPS
      break
      
    case 'INVISIBLE':
      activePowerUps.push({
        type: type,
        endTime: Date.now() + powerUpInfo.duration
      })
      break
      
    case 'MEGA_FOOD':
      // Instant effect
      let scoreMultiplier = 1
      if (hasActivePowerUp('DOUBLE_SCORE')) {
        scoreMultiplier = 2
      }
      score += 5 * scoreMultiplier
      updateScore()
      
      // Grow snake by 3 segments
      for (let i = 0; i < 3; i++) {
        const tail = snake[snake.length - 1]
        snake.push({ x: tail.x, y: tail.y })
      }
      break
      
    case 'SHRINK':
      // Remove 2 segments if possible
      if (snake.length > 3) {
        snake.pop()
        snake.pop()
      }
      break
      
    case 'SHIELD':
      activePowerUps.push({
        type: type,
        endTime: Date.now() + powerUpInfo.duration
      })
      break
  }
  
  // Play power-up sound
  playPowerUpSound()
  
  // Create particles
  createParticles(
    powerUp.x * gridSize + gridSize / 2,
    powerUp.y * gridSize + gridSize / 2
  )
}

function hasActivePowerUp(type) {
  return activePowerUps.some(effect => effect.type === type && effect.endTime > Date.now())
}

function updatePowerUpEffects() {
  const currentTime = Date.now()
  
  activePowerUps = activePowerUps.filter(effect => {
    if (effect.endTime <= currentTime) {
      // Power-up expired, remove its effect
      switch (effect.type) {
        case 'SLOW_MOTION':
          targetFPS = effect.originalFPS || 10
          frameInterval = 1000 / targetFPS
          break
      }
      return false
    }
    return true
  })
}

function playPowerUpSound() {
  if (!gameSettings.soundEnabled || !audioContext) return
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1)
  oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2)
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.2)
}

function checkAIFoodCollision() {
  const aiHead = aiSnake[0]

  if (aiHead.x === food.x && aiHead.y === food.y) {
    // AI gets points based on difficulty
    let scoreToAdd
    switch (gameSettings.difficulty) {
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
    
    aiScore += scoreToAdd
    updateAIScore(aiScore)
    generateFood()
    return true
  }

  return false
}

function checkAIPowerUpCollision() {
  if (!powerUp) return false
  
  const aiHead = aiSnake[0]
  
  if (aiHead.x === powerUp.x && aiHead.y === powerUp.y) {
    // AI doesn't get power-ups, just removes them
    powerUp = null
    return true
  }
  
  return false
}

function getAIDirection() {
  const aiHead = aiSnake[0]
  const possibleMoves = [
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 },  // Down
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 }   // Right
  ]
  
  // Filter out moves that would cause collision
  const safeMoves = possibleMoves.filter(move => {
    const newX = aiHead.x + move.dx
    const newY = aiHead.y + move.dy
    
    // Check walls
    if (newX < 0 || newX >= tileCount || newY < 0 || newY >= tileCount) {
      return false
    }
    
    // Check collision with AI's own body
    if (aiSnake.some(segment => segment.x === newX && segment.y === newY)) {
      return false
    }
    
    // Check collision with player snake
    if (snake.some(segment => segment.x === newX && segment.y === newY)) {
      return false
    }
    
    // Don't reverse direction
    if (aiLastDirection && move.dx === -aiLastDirection.dx && move.dy === -aiLastDirection.dy) {
      return false
    }
    
    return true
  })
  
  if (safeMoves.length === 0) {
    // If no safe moves, try any move to avoid immediate death
    const anyMove = possibleMoves.find(move => {
      const newX = aiHead.x + move.dx
      const newY = aiHead.y + move.dy
      return newX >= 0 && newX < tileCount && newY >= 0 && newY < tileCount
    })
    return anyMove || { dx: 0, dy: 1 }
  }
  
  // Greedy algorithm - choose move that gets closest to food
  let bestMove = safeMoves[0]
  let bestDistance = getDistance(
    aiHead.x + bestMove.dx, 
    aiHead.y + bestMove.dy, 
    food.x, 
    food.y
  )
  
  for (let move of safeMoves) {
    const newX = aiHead.x + move.dx
    const newY = aiHead.y + move.dy
    const distance = getDistance(newX, newY, food.x, food.y)
    
    // AI difficulty affects decision making
    if (gameSettings.aiDifficulty === 'easy') {
      // Easy AI: 70% chance to make optimal move
      if (Math.random() < 0.7 && distance < bestDistance) {
        bestDistance = distance
        bestMove = move
      }
    } else {
      // Hard AI: Always makes optimal move
      if (distance < bestDistance) {
        bestDistance = distance
        bestMove = move
      }
    }
  }
  
  aiLastDirection = bestMove
  return bestMove
}

function getDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) // Manhattan distance
}

function generateFood() {
  let attempts = 0
  const maxAttempts = 100
  
  do {
    food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    }
    attempts++
  } while (
    attempts < maxAttempts &&
    (snake.some(body => body.x === food.x && body.y === food.y) ||
     (gameSettings.aiEnabled && aiSnake.some(body => body.x === food.x && body.y === food.y)) ||
     (powerUp && powerUp.x === food.x && powerUp.y === food.y))
  )
  
  // 30% chance to spawn power-up after eating food
  if (Math.random() < 0.3 && !powerUp) {
    generatePowerUp()
  }
}

function generatePowerUp() {
  const powerUpTypes = Object.keys(POWER_UP_TYPES)
  const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
  
  let attempts = 0
  const maxAttempts = 100
  
  do {
    powerUp = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
      type: randomType,
      spawnTime: Date.now()
    }
    attempts++
  } while (
    attempts < maxAttempts &&
    (snake.some(body => body.x === powerUp.x && body.y === powerUp.y) ||
     (food.x === powerUp.x && food.y === powerUp.y))
  )
  
  // Power-up disappears after 10 seconds
  setTimeout(() => {
    if (powerUp && powerUp.spawnTime === powerUp.spawnTime) {
      powerUp = null
    }
  }, 10000)
}

function checkCollision() {
  const head = snake[0]
  const hasShield = hasActivePowerUp('SHIELD')

  // ชนกำแพง
  if (
    head.x < 0 ||
    head.x >= tileCount ||
    head.y < 0 ||
    head.y >= tileCount
  ) {
    if (hasShield) {
      // Remove shield and prevent collision once
      activePowerUps = activePowerUps.filter(effect => effect.type !== 'SHIELD')
      playPowerUpSound() // Play shield break sound
      return false
    }
    return true
  }

  // ชนตัวเอง
  for (let body of snake.slice(1)) {
    if (head.x === body.x && head.y === body.y) {
      if (hasShield) {
        // Remove shield and prevent collision once
        activePowerUps = activePowerUps.filter(effect => effect.type !== 'SHIELD')
        playPowerUpSound() // Play shield break sound
        return false
      }
      return true
    }
  }

  return false
}


function drawGame() {
  clearCanvas()
  drawSnake()
  drawFood()
  if (powerUp) {
    drawPowerUp()
  }
  updateParticles()
  drawPowerUpEffects()
  
  // Draw pause overlay if game is paused
  if (isPaused) {
    drawPauseOverlay()
  }
}

function drawPauseOverlay() {
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Pause text
  ctx.fillStyle = 'white'
  ctx.font = 'bold 48px Itim, cursive'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // Add text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  
  ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20)
  
  // Instruction text
  ctx.font = '20px Itim, cursive'
  ctx.fillText('กด SPACE หรือ Resume เพื่อเล่นต่อ', canvas.width / 2, canvas.height / 2 + 20)
  
  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

function gameLoop(timestamp) {
  if (!isGameRunning || isPaused) {
    if (!isGameRunning) return
    // If paused, still draw but don't update game state
    if (isPaused) {
      drawGame()
      animationId = requestAnimationFrame(gameLoop)
      return
    }
  }

  const deltaTime = timestamp - lastUpdateTime
  if (deltaTime >= frameInterval) {
    // Update power-up effects
    updatePowerUpEffects()
    
    moveSnake()
    
    if (checkCollision()) {
      gameOver()
      return
    }
    
    drawGame()
    lastUpdateTime = timestamp
  }

  animationId = requestAnimationFrame(gameLoop)
}

function updateScore() {
  if (playerScoreElement) {
    playerScoreElement.textContent = score
  }
}

function updateAIScore(aiScore) {
  if (aiScoreElement) {
    aiScoreElement.textContent = aiScore
  }
}

function updateAIDisplay() {
  const aiScoreSection = document.getElementById('aiScoreSection')
  if (aiScoreSection) {
    aiScoreSection.style.display = gameSettings.aiEnabled ? 'flex' : 'none'
  }
}

function gameOver() {
  isGameRunning = false
  isPaused = false
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  
  // Play game over sound
  playGameOverSound()
  
  // Check if this is a high score BEFORE resetting
  checkHighScore()
  
  gameOverElement.style.display = 'block'
  updateGameButtons()
  
  // Don't reset score here - it will be reset when starting new game
  // resetGame()
}

function resetGame() {
  snake = [{ x: 10, y: 10 }]
  dx = 0
  dy = 0
  score = 0
  
  // Reset AI
  aiSnake = [{ x: 5, y: 5 }]
  aiDx = 0
  aiDy = 0
  aiScore = 0
  aiLastDirection = null
}

function initializeGameState() {
  resetGame()
  generateFood()

  gameOverElement.style.display = 'none'
  isGameRunning = true
  isPaused = false
  updateScore()
  updateGameButtons()
}

function startGame() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  initializeGameState()
  animationId = requestAnimationFrame(gameLoop)
}

// Don't auto-start the game
// startGame()

// Initialize button states
updateGameButtons()

document.addEventListener('keydown', (event) => {
  // Check if score input modal is open
  const scoreModal = document.getElementById('scoreInputModal')
  if (scoreModal && scoreModal.style.display === 'block') {
    // Don't interfere with score input modal
    return
  }
  
  // Allow spacebar to toggle pause
  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    if (isGameRunning) {
      togglePause()
    }
    return
  }
  
  // Don't process arrow keys if game is paused
  if (isPaused) return
  
  event.preventDefault()
  if (event.key === 'ArrowUp') {
    if (dy !== 1) {
      dy = -1
      dx = 0
    }
  } else if (event.key === 'ArrowDown') {
    if (dy !== -1) {
      dy = 1
      dx = 0
    }
  } else if (event.key === 'ArrowLeft') {
    if (dx !== 1) {
      dx = -1
      dy = 0
    }
  } else if (event.key === 'ArrowRight') {
    if (dx !== -1) {
      dx = 1
      dy = 0
    }
  }
})

// Game Control Functions
function togglePause() {
  if (!isGameRunning) return
  
  isPaused = !isPaused
  updateGameButtons()
}

function updateGameButtons() {
  const pauseBtn = document.getElementById('pauseBtn')
  const settingsBtn = document.getElementById('settingsBtn')
  
  if (!isGameRunning) {
    // Game over state
    pauseBtn.textContent = 'Pause'
    pauseBtn.disabled = true
    settingsBtn.disabled = false
  } else if (isPaused) {
    // Paused state
    pauseBtn.textContent = 'Resume'
    pauseBtn.disabled = false
    settingsBtn.disabled = false
  } else {
    // Running state
    pauseBtn.textContent = 'Pause'
    pauseBtn.disabled = false
    settingsBtn.disabled = true
  }
}

// Settings Functions
function openSettings() {
  // Don't allow settings to open if game is running and not paused
  if (isGameRunning && !isPaused) {
    return
  }
  
  const modal = document.getElementById('settingsModal')
  modal.style.display = 'block'
  
  // Load current settings
  loadCurrentSettings()
}

function closeSettings() {
  const modal = document.getElementById('settingsModal')
  modal.style.display = 'none'
  
  // Restore original theme if settings were not saved
  document.body.setAttribute('data-theme', gameSettings.theme)
}

function loadCurrentSettings() {
  // Load theme
  const themeOptions = document.querySelectorAll('.theme-option')
  themeOptions.forEach(option => {
    option.classList.remove('active')
    if (option.dataset.theme === gameSettings.theme) {
      option.classList.add('active')
    }
  })
  
  // Load difficulty
  const difficultyRadios = document.querySelectorAll('input[name="difficulty"]')
  difficultyRadios.forEach(radio => {
    radio.checked = radio.value === gameSettings.difficulty
    // Disable difficulty options during active gameplay (including when paused)
    radio.disabled = isGameRunning
  })
  
  // Load game size
  const gameSizeRadios = document.querySelectorAll('input[name="gameSize"]')
  gameSizeRadios.forEach(radio => {
    radio.checked = radio.value === gameSettings.gameSize
    // Disable game size options during active gameplay (including when paused)
    radio.disabled = isGameRunning
  })
  
  // Load sound setting
  const soundToggle = document.getElementById('soundToggle')
  soundToggle.checked = gameSettings.soundEnabled
  
  // Load AI settings
  const aiToggle = document.getElementById('aiToggle')
  aiToggle.checked = gameSettings.aiEnabled
  
  const aiDifficultyRadios = document.querySelectorAll('input[name="aiDifficulty"]')
  aiDifficultyRadios.forEach(radio => {
    radio.checked = radio.value === gameSettings.aiDifficulty
  })
  
  // Toggle AI difficulty section
  const aiDifficultySection = document.getElementById('aiDifficultySection')
  if (aiDifficultySection) {
    aiDifficultySection.classList.toggle('active', gameSettings.aiEnabled)
  }
}

function applySettings() {
  // Apply theme (already applied in preview, just save it)
  const selectedTheme = document.querySelector('.theme-option.active')
  if (selectedTheme) {
    gameSettings.theme = selectedTheme.dataset.theme
  }
  
  // Apply difficulty - only if game is not running (not during pause either)
  const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked')
  if (selectedDifficulty && !isGameRunning) {
    gameSettings.difficulty = selectedDifficulty.value
    updateGameSpeed()
  }
  
  // Apply game size - only if game is not running (not during pause either)
  const selectedGameSize = document.querySelector('input[name="gameSize"]:checked')
  if (selectedGameSize && !isGameRunning) {
    gameSettings.gameSize = selectedGameSize.value
    updateGameSize()
  }
  
  // Apply sound setting
  const soundToggle = document.getElementById('soundToggle')
  gameSettings.soundEnabled = soundToggle.checked
  
  // Apply AI settings
  const aiToggle = document.getElementById('aiToggle')
  gameSettings.aiEnabled = aiToggle.checked
  
  const selectedAIDifficulty = document.querySelector('input[name="aiDifficulty"]:checked')
  if (selectedAIDifficulty) {
    gameSettings.aiDifficulty = selectedAIDifficulty.value
  }
  
  // Update AI display
  updateAIDisplay()
  
  // Save settings to localStorage
  localStorage.setItem('snakeGameSettings', JSON.stringify(gameSettings))
  
  // Close modal without reverting theme
  const modal = document.getElementById('settingsModal')
  modal.style.display = 'none'
}

function updateGameSpeed() {
  switch (gameSettings.difficulty) {
    case 'easy':
      targetFPS = 8
      break
    case 'medium':
      targetFPS = 12
      break
    case 'hard':
      targetFPS = 18
      break
  }
  frameInterval = 1000 / targetFPS
}

function updateGameSize() {
  let newSize
  switch (gameSettings.gameSize) {
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
  
  canvas.width = newSize
  canvas.height = newSize
  tileCount = newSize / gridSize
  
  // Reset game state if game size changed during gameplay
  if (isGameRunning) {
    // Restart the game with new size
    startGame()
  }
}

// Theme option click handlers
document.addEventListener('DOMContentLoaded', function() {
  const themeOptions = document.querySelectorAll('.theme-option')
  themeOptions.forEach(option => {
    option.addEventListener('click', function() {
      themeOptions.forEach(opt => opt.classList.remove('active'))
      this.classList.add('active')
      
      // Apply theme preview immediately
      const theme = this.dataset.theme
      document.body.setAttribute('data-theme', theme)
    })
  })
  
  // Load saved settings
  const savedSettings = localStorage.getItem('snakeGameSettings')
  if (savedSettings) {
    gameSettings = { ...gameSettings, ...JSON.parse(savedSettings) }
    document.body.setAttribute('data-theme', gameSettings.theme)
    updateGameSpeed()
    updateGameSize()
    updateAIDisplay()
  }
  
  // Load scoreboard
  loadScoreboard()
  
  // Initialize button states
  updateGameButtons()
  
  // Initialize audio context
  initAudio()
  
  // Close modal when clicking outside
  const modal = document.getElementById('settingsModal')
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeSettings()
    }
  })
  
  // Add keyboard support for score input
  const playerNameInput = document.getElementById('playerName')
  playerNameInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      saveScore()
    } else if (event.key === 'Escape') {
      autoSaveScore()
    }
  })
  
  // Close score input modal when clicking outside
  const scoreModal = document.getElementById('scoreInputModal')
  scoreModal.addEventListener('click', function(event) {
    if (event.target === scoreModal) {
      autoSaveScore()
    }
  })
  
  // Close leaderboard modal when clicking outside
  const leaderboardModal = document.getElementById('leaderboardModal')
  leaderboardModal.addEventListener('click', function(event) {
    if (event.target === leaderboardModal) {
      closeLeaderboard()
    }
  })
  
  // Add AI toggle event listener
  const aiToggle = document.getElementById('aiToggle')
  if (aiToggle) {
    aiToggle.addEventListener('change', function() {
      const aiDifficultySection = document.getElementById('aiDifficultySection')
      if (aiDifficultySection) {
        aiDifficultySection.classList.toggle('active', this.checked)
      }
    })
  }
})

// Audio Functions
function initAudio() {
  if (!gameSettings.soundEnabled) return
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  } catch (e) {
    console.log('Audio not supported')
  }
}

function playEatSound() {
  if (!gameSettings.soundEnabled || !audioContext) return
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1)
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.1)
}

function playGameOverSound() {
  if (!gameSettings.soundEnabled || !audioContext) return
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5)
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.5)
}

// Function to get theme colors from CSS variables
function getThemeColors() {
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

// Scoreboard Functions
function loadScoreboard() {
  const savedScoreboard = localStorage.getItem('snakeGameScoreboard')
  if (savedScoreboard) {
    scoreboard = JSON.parse(savedScoreboard)
  }
  displayScoreboard()
}

function saveScoreboard() {
  localStorage.setItem('snakeGameScoreboard', JSON.stringify(scoreboard))
}

function displayScoreboard() {
  const scoreboardElement = document.getElementById('leaderboardScores')
  
  if (scoreboard.length === 0) {
    scoreboardElement.innerHTML = '<div style="text-align: center; opacity: 0.6; padding: 40px; font-size: 18px;">ยังไม่มีคะแนน<br><span style="font-size: 14px; margin-top: 10px; display: block;">เล่นเกมเพื่อเก็บคะแนนกันเถอะ!</span></div>'
    return
  }
  
  // Sort by score (descending)
  const sortedScores = [...scoreboard].sort((a, b) => b.score - a.score)
  
  const html = sortedScores.slice(0, 10).map((entry, index) => {
    const difficultyText = {
      easy: 'ง่าย',
      medium: 'ปานกลาง', 
      hard: 'ยาก'
    }
    
    const rank = index + 1
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
    
    return `
      <div class="score-entry ${index === 0 ? 'top-score' : ''}">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px; min-width: 30px;">${rankEmoji}</span>
          <div>
            <span class="score-name">${entry.name}</span>
            <span class="score-difficulty">(${difficultyText[entry.difficulty]})</span>
          </div>
        </div>
        <span class="score-points">${entry.score}</span>
      </div>
    `
  }).join('')
  
  scoreboardElement.innerHTML = html
}

function checkHighScore() {
  // Check if current score qualifies for scoreboard (top 10)
  const sortedScores = [...scoreboard].sort((a, b) => b.score - a.score)
  
  if (score > 0 && (scoreboard.length < 10 || score > (sortedScores[9]?.score || 0))) {
    // Show score input modal
    document.getElementById('finalScore').textContent = score
    const modal = document.getElementById('scoreInputModal')
    modal.style.display = 'block'
    
    // Clear previous input and focus after a short delay
    const nameInput = document.getElementById('playerName')
    nameInput.value = ''
    setTimeout(() => {
      nameInput.focus()
    }, 100)
  }
}

function saveScore() {
  const playerName = document.getElementById('playerName').value.trim()
  
  if (!playerName) {
    alert('กรุณาใส่ชื่อ')
    return
  }
  
  addScoreToBoard(playerName)
}

function autoSaveScore() {
  // Generate anonymous name
  const anonNames = [
    'ผู้เล่นลับ', 'นักล่างู', 'อนาม', 'ผู้ไม่ประสงค์ออกนาม',
    'คนลึกลับ', 'ผู้เล่นมือใหม่', 'ผู้เล่นมืออาชีพ', 'นินจา'
  ]
  const randomName = anonNames[Math.floor(Math.random() * anonNames.length)] + ' #' + Math.floor(Math.random() * 999 + 1)
  
  addScoreToBoard(randomName)
}

function addScoreToBoard(playerName) {
  // Add score to scoreboard
  const newEntry = {
    name: playerName,
    score: score,
    difficulty: gameSettings.difficulty,
    date: new Date().toLocaleDateString('th-TH')
  }
  
  scoreboard.push(newEntry)
  
  // Keep only top 10 scores
  scoreboard.sort((a, b) => b.score - a.score)
  if (scoreboard.length > 10) {
    scoreboard = scoreboard.slice(0, 10)
  }
  saveScoreboard()
  displayScoreboard()
  
  // Close modal
  closeScoreModal()
}

function closeScoreModal() {
  document.getElementById('scoreInputModal').style.display = 'none'
  document.getElementById('playerName').value = ''
}


function openLeaderboard() {
  const modal = document.getElementById('leaderboardModal')
  modal.style.display = 'block'
  displayScoreboard()
}

function closeLeaderboard() {
  const modal = document.getElementById('leaderboardModal')
  modal.style.display = 'none'
}

function clearScoreboard() {
  if (confirm('คุณต้องการล้างคะแนนทั้งหมดหรือไม่?')) {
    scoreboard = []
    saveScoreboard()
    displayScoreboard()
  }
}

