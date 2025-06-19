import { Game } from './game.js'
import { UI } from './ui.js'
import { PowerUps } from './powerups.js'
import { AI } from './ai.js'
import './styles.css'

// Game instance
let game = null

// Initialize the application
function init() {
  try {
    // Create game instance
    game = new Game()
    
    // Initialize all modules
    game.init()
    
    console.log('Snake Game initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Snake Game:', error)
  }
}

// Start initialization when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// Make game globally available for debugging
window.game = game