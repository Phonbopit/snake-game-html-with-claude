// AI system for snake game
export class AI {
  constructor(game) {
    this.game = game
    this.enabled = false
    this.difficulty = 'easy'
    this.snake = [{ x: 5, y: 5 }]
    this.dx = 0
    this.dy = 0
    this.score = 0
    this.lastDirection = null
  }

  reset() {
    this.snake = [{ x: 5, y: 5 }]
    this.dx = 0
    this.dy = 0
    this.score = 0
    this.lastDirection = null
  }

  move() {
    if (!this.enabled) return

    // Get AI direction using greedy algorithm
    const direction = this.getDirection()
    this.dx = direction.dx
    this.dy = direction.dy
    
    const head = {
      x: this.snake[0].x + this.dx,
      y: this.snake[0].y + this.dy,
    }

    this.snake.unshift(head)

    // Check collision before continuing
    if (this.checkCollision()) {
      this.gameOver()
      return
    }

    let foodEaten = this.checkFoodCollision()
    let powerUpEaten = this.game.powerUps.checkAICollision()

    if (!foodEaten && !powerUpEaten) {
      this.snake.pop()
    }
  }

  checkFoodCollision() {
    const head = this.snake[0]

    if (head.x === this.game.food.x && head.y === this.game.food.y) {
      // AI gets points based on difficulty
      let scoreToAdd
      switch (this.game.settings.difficulty) {
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
      
      this.score += scoreToAdd
      this.game.ui.updateAIScore(this.score)
      this.game.generateFood()
      return true
    }

    return false
  }

  getDirection() {
    const head = this.snake[0]
    const possibleMoves = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 }   // Right
    ]
    
    // Filter out moves that would cause collision
    const safeMoves = possibleMoves.filter(move => {
      const newX = head.x + move.dx
      const newY = head.y + move.dy
      
      // Check walls
      if (newX < 0 || newX >= this.game.tileCount || newY < 0 || newY >= this.game.tileCount) {
        return false
      }
      
      // Check collision with AI's own body
      if (this.snake.some(segment => segment.x === newX && segment.y === newY)) {
        return false
      }
      
      // Check collision with player snake
      if (this.game.snake.some(segment => segment.x === newX && segment.y === newY)) {
        return false
      }
      
      // Don't reverse direction
      if (this.lastDirection && move.dx === -this.lastDirection.dx && move.dy === -this.lastDirection.dy) {
        return false
      }
      
      return true
    })
    
    if (safeMoves.length === 0) {
      // If no safe moves, try any move to avoid immediate death
      const anyMove = possibleMoves.find(move => {
        const newX = head.x + move.dx
        const newY = head.y + move.dy
        return newX >= 0 && newX < this.game.tileCount && newY >= 0 && newY < this.game.tileCount
      })
      return anyMove || { dx: 0, dy: 1 }
    }
    
    // Greedy algorithm - choose move that gets closest to food
    let bestMove = safeMoves[0]
    let bestDistance = this.getDistance(
      head.x + bestMove.dx, 
      head.y + bestMove.dy, 
      this.game.food.x, 
      this.game.food.y
    )
    
    for (let move of safeMoves) {
      const newX = head.x + move.dx
      const newY = head.y + move.dy
      const distance = this.getDistance(newX, newY, this.game.food.x, this.game.food.y)
      
      // AI difficulty affects decision making
      if (this.difficulty === 'easy') {
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
    
    this.lastDirection = bestMove
    return bestMove
  }

  getDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) // Manhattan distance
  }

  checkCollision() {
    const head = this.snake[0]

    // Wall collision
    if (
      head.x < 0 ||
      head.x >= this.game.tileCount ||
      head.y < 0 ||
      head.y >= this.game.tileCount
    ) {
      return true
    }

    // Self collision (check against body, excluding head)
    for (let i = 1; i < this.snake.length; i++) {
      const body = this.snake[i]
      if (head.x === body.x && head.y === body.y) {
        return true
      }
    }

    // Collision with player snake
    for (let segment of this.game.snake) {
      if (head.x === segment.x && head.y === segment.y) {
        return true
      }
    }

    return false
  }

  gameOver() {
    console.log('AI Game Over! AI Score:', this.score)
    // Reset AI snake to starting position
    this.reset()
    // AI doesn't stop the main game, just resets itself
  }

  draw(ctx) {
    if (!this.enabled) return

    this.snake.forEach((segment, index) => {
      const x = segment.x * this.game.gridSize
      const y = segment.y * this.game.gridSize
      const isHead = index === 0
      const radius = 4
      
      ctx.save()
      
      // Create gradient for snake segments
      const gradient = ctx.createLinearGradient(x, y, x + this.game.gridSize, y + this.game.gridSize)
      
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
      
      ctx.fillStyle = gradient
      
      // Draw rounded rectangle for snake segments
      ctx.beginPath()
      ctx.roundRect(x + 1, y + 1, this.game.gridSize - 2, this.game.gridSize - 2, radius)
      ctx.fill()
      
      // Add border for better definition
      ctx.strokeStyle = isHead ? '#B71C1C' : '#D32F2F'
      ctx.lineWidth = isHead ? 2 : 1
      ctx.stroke()
      
      // Draw eyes for the head
      if (isHead) {
        const eyeSize = 2
        const eyeOffset = 5
        
        ctx.fillStyle = '#ffffff'
        // Left eye - square
        ctx.fillRect(x + eyeOffset - 1, y + eyeOffset - 1, eyeSize + 1, eyeSize + 1)
        
        // Right eye - square
        ctx.fillRect(x + this.game.gridSize - eyeOffset - eyeSize, y + eyeOffset - 1, eyeSize + 1, eyeSize + 1)
        
        // Eye pupils - square
        ctx.fillStyle = '#000000'
        ctx.fillRect(x + eyeOffset, y + eyeOffset, 1, 1)
        ctx.fillRect(x + this.game.gridSize - eyeOffset - 1, y + eyeOffset, 1, 1)
      }
      
      ctx.restore()
    })
  }
}