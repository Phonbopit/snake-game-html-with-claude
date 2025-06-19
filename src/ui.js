// UI management system
export class UI {
  constructor(game) {
    this.game = game
    this.scoreboard = []
    this.loadScoreboard()
    this.bindEvents()
  }

  bindEvents() {
    // Theme option click handlers
    const themeOptions = document.querySelectorAll('.theme-option')
    themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        themeOptions.forEach(opt => opt.classList.remove('active'))
        option.classList.add('active')
        
        // Apply theme preview immediately
        const theme = option.dataset.theme
        document.body.setAttribute('data-theme', theme)
      })
    })

    // Close modal when clicking outside
    const settingsModal = document.getElementById('settingsModal')
    settingsModal.addEventListener('click', (event) => {
      if (event.target === settingsModal) {
        this.closeSettings()
      }
    })

    // Add keyboard support for score input
    const playerNameInput = document.getElementById('playerName')
    playerNameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.saveScore()
      } else if (event.key === 'Escape') {
        this.autoSaveScore()
      }
    })

    // Close score input modal when clicking outside
    const scoreModal = document.getElementById('scoreInputModal')
    scoreModal.addEventListener('click', (event) => {
      if (event.target === scoreModal) {
        this.autoSaveScore()
      }
    })

    // Close leaderboard modal when clicking outside
    const leaderboardModal = document.getElementById('leaderboardModal')
    leaderboardModal.addEventListener('click', (event) => {
      if (event.target === leaderboardModal) {
        this.closeLeaderboard()
      }
    })

    // Add AI toggle event listener
    const aiToggle = document.getElementById('aiToggle')
    if (aiToggle) {
      aiToggle.addEventListener('change', () => {
        const aiDifficultySection = document.getElementById('aiDifficultySection')
        if (aiDifficultySection) {
          aiDifficultySection.classList.toggle('active', aiToggle.checked)
        }
      })
    }
  }

  updateScore() {
    const playerScoreElement = document.getElementById('playerScore')
    if (playerScoreElement) {
      playerScoreElement.textContent = this.game.score
    }
  }

  updateAIScore(aiScore) {
    const aiScoreElement = document.getElementById('aiScore')
    if (aiScoreElement) {
      aiScoreElement.textContent = aiScore
    }
  }

  updateAIDisplay() {
    const aiScoreSection = document.getElementById('aiScoreSection')
    if (aiScoreSection) {
      aiScoreSection.style.display = this.game.settings.aiEnabled ? 'flex' : 'none'
    }
  }

  updateGameButtons() {
    const pauseBtn = document.getElementById('pauseBtn')
    const settingsBtn = document.getElementById('settingsBtn')
    
    if (!this.game.isRunning) {
      // Game over state
      pauseBtn.textContent = 'Pause'
      pauseBtn.disabled = true
      settingsBtn.disabled = false
    } else if (this.game.isPaused) {
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
  openSettings() {
    // Don't allow settings to open if game is running and not paused
    if (this.game.isRunning && !this.game.isPaused) {
      return
    }
    
    const modal = document.getElementById('settingsModal')
    modal.style.display = 'block'
    
    // Load current settings
    this.loadCurrentSettings()
  }

  closeSettings() {
    const modal = document.getElementById('settingsModal')
    modal.style.display = 'none'
    
    // Restore original theme if settings were not saved
    document.body.setAttribute('data-theme', this.game.settings.theme)
  }

  loadCurrentSettings() {
    // Load theme
    const themeOptions = document.querySelectorAll('.theme-option')
    themeOptions.forEach(option => {
      option.classList.remove('active')
      if (option.dataset.theme === this.game.settings.theme) {
        option.classList.add('active')
      }
    })
    
    // Load difficulty
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]')
    difficultyRadios.forEach(radio => {
      radio.checked = radio.value === this.game.settings.difficulty
      // Disable difficulty options during active gameplay (including when paused)
      radio.disabled = this.game.isRunning
    })
    
    // Load game size
    const gameSizeRadios = document.querySelectorAll('input[name="gameSize"]')
    gameSizeRadios.forEach(radio => {
      radio.checked = radio.value === this.game.settings.gameSize
      // Disable game size options during active gameplay (including when paused)
      radio.disabled = this.game.isRunning
    })
    
    // Load sound setting
    const soundToggle = document.getElementById('soundToggle')
    soundToggle.checked = this.game.settings.soundEnabled
    
    // Load AI settings
    const aiToggle = document.getElementById('aiToggle')
    aiToggle.checked = this.game.settings.aiEnabled
    
    const aiDifficultyRadios = document.querySelectorAll('input[name="aiDifficulty"]')
    aiDifficultyRadios.forEach(radio => {
      radio.checked = radio.value === this.game.settings.aiDifficulty
    })
    
    // Toggle AI difficulty section
    const aiDifficultySection = document.getElementById('aiDifficultySection')
    if (aiDifficultySection) {
      aiDifficultySection.classList.toggle('active', this.game.settings.aiEnabled)
    }
  }

  applySettings() {
    // Apply theme (already applied in preview, just save it)
    const selectedTheme = document.querySelector('.theme-option.active')
    if (selectedTheme) {
      this.game.settings.theme = selectedTheme.dataset.theme
    }
    
    // Apply difficulty - only if game is not running (not during pause either)
    const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked')
    if (selectedDifficulty && !this.game.isRunning) {
      this.game.settings.difficulty = selectedDifficulty.value
      this.game.updateGameSpeed()
    }
    
    // Apply game size - only if game is not running (not during pause either)
    const selectedGameSize = document.querySelector('input[name="gameSize"]:checked')
    if (selectedGameSize && !this.game.isRunning) {
      this.game.settings.gameSize = selectedGameSize.value
      this.game.updateGameSize()
    }
    
    // Apply sound setting
    const soundToggle = document.getElementById('soundToggle')
    this.game.settings.soundEnabled = soundToggle.checked
    
    // Apply AI settings
    const aiToggle = document.getElementById('aiToggle')
    this.game.settings.aiEnabled = aiToggle.checked
    this.game.ai.enabled = aiToggle.checked
    
    const selectedAIDifficulty = document.querySelector('input[name="aiDifficulty"]:checked')
    if (selectedAIDifficulty) {
      this.game.settings.aiDifficulty = selectedAIDifficulty.value
      this.game.ai.difficulty = selectedAIDifficulty.value
    }
    
    // Update AI display
    this.updateAIDisplay()
    
    // Save settings to localStorage
    localStorage.setItem('snakeGameSettings', JSON.stringify(this.game.settings))
    
    // Close modal without reverting theme
    const modal = document.getElementById('settingsModal')
    modal.style.display = 'none'
  }

  // Scoreboard Functions
  loadScoreboard() {
    const savedScoreboard = localStorage.getItem('snakeGameScoreboard')
    if (savedScoreboard) {
      this.scoreboard = JSON.parse(savedScoreboard)
    }
    this.displayScoreboard()
  }

  saveScoreboard() {
    localStorage.setItem('snakeGameScoreboard', JSON.stringify(this.scoreboard))
  }

  displayScoreboard() {
    const scoreboardElement = document.getElementById('leaderboardScores')
    
    if (this.scoreboard.length === 0) {
      scoreboardElement.innerHTML = '<div style="text-align: center; opacity: 0.6; padding: 40px; font-size: 18px;">ยังไม่มีคะแนน<br><span style="font-size: 14px; margin-top: 10px; display: block;">เล่นเกมเพื่อเก็บคะแนนกันเถอะ!</span></div>'
      return
    }
    
    // Sort by score (descending)
    const sortedScores = [...this.scoreboard].sort((a, b) => b.score - a.score)
    
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

  checkHighScore() {
    // Check if current score qualifies for scoreboard (top 10)
    const sortedScores = [...this.scoreboard].sort((a, b) => b.score - a.score)
    
    if (this.game.score > 0 && (this.scoreboard.length < 10 || this.game.score > (sortedScores[9]?.score || 0))) {
      // Show score input modal
      document.getElementById('finalScore').textContent = this.game.score
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

  saveScore() {
    const playerName = document.getElementById('playerName').value.trim()
    
    if (!playerName) {
      alert('กรุณาใส่ชื่อ')
      return
    }
    
    this.addScoreToBoard(playerName)
  }

  autoSaveScore() {
    // Generate anonymous name
    const anonNames = [
      'ผู้เล่นลับ', 'นักล่างู', 'อนาม', 'ผู้ไม่ประสงค์ออกนาม',
      'คนลึกลับ', 'ผู้เล่นมือใหม่', 'ผู้เล่นมืออาชีพ', 'นินจา'
    ]
    const randomName = anonNames[Math.floor(Math.random() * anonNames.length)] + ' #' + Math.floor(Math.random() * 999 + 1)
    
    this.addScoreToBoard(randomName)
  }

  addScoreToBoard(playerName) {
    // Add score to scoreboard
    const newEntry = {
      name: playerName,
      score: this.game.score,
      difficulty: this.game.settings.difficulty,
      date: new Date().toLocaleDateString('th-TH')
    }
    
    this.scoreboard.push(newEntry)
    
    // Keep only top 10 scores
    this.scoreboard.sort((a, b) => b.score - a.score)
    if (this.scoreboard.length > 10) {
      this.scoreboard = this.scoreboard.slice(0, 10)
    }
    this.saveScoreboard()
    this.displayScoreboard()
    
    // Close modal
    this.closeScoreModal()
  }

  closeScoreModal() {
    document.getElementById('scoreInputModal').style.display = 'none'
    document.getElementById('playerName').value = ''
  }

  openLeaderboard() {
    const modal = document.getElementById('leaderboardModal')
    modal.style.display = 'block'
    this.displayScoreboard()
  }

  closeLeaderboard() {
    const modal = document.getElementById('leaderboardModal')
    modal.style.display = 'none'
  }

  clearScoreboard() {
    if (confirm('คุณต้องการล้างคะแนนทั้งหมดหรือไม่?')) {
      this.scoreboard = []
      this.saveScoreboard()
      this.displayScoreboard()
    }
  }
}

// Global functions for HTML onclick handlers
window.openSettings = function() {
  if (window.game && window.game.ui) {
    window.game.ui.openSettings()
  }
}

window.closeSettings = function() {
  if (window.game && window.game.ui) {
    window.game.ui.closeSettings()
  }
}

window.applySettings = function() {
  if (window.game && window.game.ui) {
    window.game.ui.applySettings()
  }
}

window.openLeaderboard = function() {
  if (window.game && window.game.ui) {
    window.game.ui.openLeaderboard()
  }
}

window.closeLeaderboard = function() {
  if (window.game && window.game.ui) {
    window.game.ui.closeLeaderboard()
  }
}

window.clearScoreboard = function() {
  if (window.game && window.game.ui) {
    window.game.ui.clearScoreboard()
  }
}

window.saveScore = function() {
  if (window.game && window.game.ui) {
    window.game.ui.saveScore()
  }
}

window.autoSaveScore = function() {
  if (window.game && window.game.ui) {
    window.game.ui.autoSaveScore()
  }
}

window.startGame = function() {
  if (window.game) {
    window.game.start()
  }
}

window.togglePause = function() {
  if (window.game) {
    window.game.togglePause()
  }
}