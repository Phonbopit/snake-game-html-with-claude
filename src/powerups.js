// Power-up system
export const POWER_UP_TYPES = {
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

export class PowerUps {
  constructor(game) {
    this.game = game
    this.powerUp = null
    this.activePowerUps = []
  }

  generatePowerUp() {
    const powerUpTypes = Object.keys(POWER_UP_TYPES)
    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
    
    let attempts = 0
    const maxAttempts = 100
    
    do {
      this.powerUp = {
        x: Math.floor(Math.random() * this.game.tileCount),
        y: Math.floor(Math.random() * this.game.tileCount),
        type: randomType,
        spawnTime: Date.now()
      }
      attempts++
    } while (
      attempts < maxAttempts &&
      (this.game.snake.some(body => body.x === this.powerUp.x && body.y === this.powerUp.y) ||
       (this.game.food.x === this.powerUp.x && this.game.food.y === this.powerUp.y) ||
       (this.game.ai.enabled && this.game.ai.snake.some(body => body.x === this.powerUp.x && body.y === this.powerUp.y)))
    )
    
    // Power-up disappears after 10 seconds
    setTimeout(() => {
      if (this.powerUp && this.powerUp.spawnTime === this.powerUp.spawnTime) {
        this.powerUp = null
      }
    }, 10000)
  }

  checkCollision() {
    if (!this.powerUp) return false
    
    const head = this.game.snake[0]
    
    if (head.x === this.powerUp.x && head.y === this.powerUp.y) {
      this.applyPowerUp(this.powerUp.type)
      this.powerUp = null
      return true
    }
    
    return false
  }

  checkAICollision() {
    if (!this.powerUp || !this.game.ai.enabled) return false
    
    const aiHead = this.game.ai.snake[0]
    
    if (aiHead.x === this.powerUp.x && aiHead.y === this.powerUp.y) {
      // AI doesn't get power-ups, just removes them
      this.powerUp = null
      return true
    }
    
    return false
  }

  applyPowerUp(type) {
    const powerUpInfo = POWER_UP_TYPES[type]
    
    switch (type) {
      case 'DOUBLE_SCORE':
        this.activePowerUps.push({
          type: type,
          endTime: Date.now() + powerUpInfo.duration
        })
        break
        
      case 'SLOW_MOTION':
        this.activePowerUps.push({
          type: type,
          endTime: Date.now() + powerUpInfo.duration,
          originalFPS: this.game.targetFPS
        })
        this.game.targetFPS = Math.max(3, this.game.targetFPS * 0.5)
        this.game.frameInterval = 1000 / this.game.targetFPS
        break
        
      case 'INVISIBLE':
        this.activePowerUps.push({
          type: type,
          endTime: Date.now() + powerUpInfo.duration
        })
        break
        
      case 'MEGA_FOOD':
        // Instant effect
        let scoreMultiplier = 1
        if (this.hasActivePowerUp('DOUBLE_SCORE')) {
          scoreMultiplier = 2
        }
        this.game.score += 5 * scoreMultiplier
        this.game.ui.updateScore()
        
        // Grow snake by 3 segments
        for (let i = 0; i < 3; i++) {
          const tail = this.game.snake[this.game.snake.length - 1]
          this.game.snake.push({ x: tail.x, y: tail.y })
        }
        break
        
      case 'SHRINK':
        // Remove 2 segments if possible
        if (this.game.snake.length > 3) {
          this.game.snake.pop()
          this.game.snake.pop()
        }
        break
        
      case 'SHIELD':
        this.activePowerUps.push({
          type: type,
          endTime: Date.now() + powerUpInfo.duration
        })
        break
    }
    
    // Play power-up sound
    this.game.playPowerUpSound()
    
    // Create particles
    this.game.createParticles(
      this.powerUp.x * this.game.gridSize + this.game.gridSize / 2,
      this.powerUp.y * this.game.gridSize + this.game.gridSize / 2
    )
  }

  hasActivePowerUp(type) {
    return this.activePowerUps.some(effect => effect.type === type && effect.endTime > Date.now())
  }

  updateEffects() {
    const currentTime = Date.now()
    
    this.activePowerUps = this.activePowerUps.filter(effect => {
      if (effect.endTime <= currentTime) {
        // Power-up expired, remove its effect
        switch (effect.type) {
          case 'SLOW_MOTION':
            this.game.targetFPS = effect.originalFPS || 10
            this.game.frameInterval = 1000 / this.game.targetFPS
            break
        }
        return false
      }
      return true
    })
  }

  draw(ctx) {
    if (this.powerUp) {
      this.drawPowerUp(ctx)
    }
    this.drawEffects(ctx)
  }

  drawPowerUp(ctx) {
    const powerUpInfo = POWER_UP_TYPES[this.powerUp.type]
    const centerX = this.powerUp.x * this.game.gridSize + this.game.gridSize / 2
    const centerY = this.powerUp.y * this.game.gridSize + this.game.gridSize / 2
    const baseRadius = this.game.gridSize / 2 - 1
    
    // Pulsing animation
    const timeSinceSpawn = Date.now() - this.powerUp.spawnTime
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
    ctx.font = `${this.game.gridSize * 0.6}px Arial`
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

  drawEffects(ctx) {
    // Draw active power-up indicators
    if (this.activePowerUps.length > 0) {
      ctx.save()
      ctx.font = '14px Itim, cursive'
      ctx.textAlign = 'left'
      
      this.activePowerUps.forEach((effect, index) => {
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
}