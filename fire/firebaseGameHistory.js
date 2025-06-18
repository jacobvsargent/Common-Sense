// firebaseGameHistory.js - Fixed version with proper initialization

class FirebaseGameHistoryTracker {
  constructor() {
    this.historyRef = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.pendingOperations = [];
  }

  // Initialize Firebase connection
  async initialize() {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      // Wait for Firebase to be available
      const checkFirebase = () => {
        if (typeof firebase !== 'undefined' && firebase.database && db) {
          this.historyRef = db.ref('gameHistory');
          this.isInitialized = true;
          console.log('Firebase Game History initialized');
          
          // Process any pending operations
          this.processPendingOperations();
          
          resolve();
        } else {
          console.log('Waiting for Firebase to initialize...');
          setTimeout(checkFirebase, 100);
        }
      };
      
      checkFirebase();
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          reject(new Error('Firebase initialization timeout'));
        }
      }, 10000);
    });

    return this.initializationPromise;
  }

  // Process operations that were queued before initialization
  processPendingOperations() {
    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      operation();
    }
  }

  // Ensure initialization before any operation
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Record a completed game to Firebase
  async recordGame(gameData) {
    try {
      await this.ensureInitialized();
      
      const gameRecord = {
        gameCode: gameData.gameCode,
        completedAt: firebase.database.ServerValue.TIMESTAMP,
        completedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        totalRounds: gameData.totalRounds,
        roundsCompleted: gameData.roundsCompleted,
        difficulty: gameData.difficulty,
        players: gameData.players, // Array of {name, finalScore}
        status: gameData.status, // 'completed' or 'incomplete'
        duration: gameData.duration || null // Optional: game duration in minutes
      };

      // Use the gameCode as the key, but add timestamp to make it unique
      const uniqueKey = `${gameData.gameCode}_${Date.now()}`;
      
      const result = await this.historyRef.child(uniqueKey).set(gameRecord);
      console.log('Game recorded to Firebase:', uniqueKey);
      return gameRecord;
    } catch (error) {
      console.error('Error recording game to Firebase:', error);
      throw error;
    }
  }

  // Get all game history from Firebase
  async getAllHistory() {
    try {
      await this.ensureInitialized();
      
      const snapshot = await this.historyRef.once('value');
      const history = [];
      snapshot.forEach(childSnapshot => {
        const game = childSnapshot.val();
        game.id = childSnapshot.key;
        history.push(game);
      });
      
      // Sort by completion date (newest first)
      return history.sort((a, b) => {
        const aTime = a.completedAt || 0;
        const bTime = b.completedAt || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error fetching game history:', error);
      return [];
    }
  }

  // Get games from a specific date range
  async getGamesInDateRange(startDate, endDate) {
    const history = await this.getAllHistory();
    return history.filter(game => {
      const gameDate = game.completedDate;
      return gameDate >= startDate && gameDate <= endDate;
    });
  }

  // Get games by status
  async getGamesByStatus(status) {
    try {
      await this.ensureInitialized();
      
      const snapshot = await this.historyRef.orderByChild('status').equalTo(status).once('value');
      const games = [];
      snapshot.forEach(childSnapshot => {
        const game = childSnapshot.val();
        game.id = childSnapshot.key;
        games.push(game);
      });
      return games;
    } catch (error) {
      console.error('Error fetching games by status:', error);
      return [];
    }
  }

  // Convert Firebase history to CSV format
  async convertToCSV() {
    try {
      const history = await this.getAllHistory();
      
      if (history.length === 0) {
        return 'Game Code,Date,Status,Total Rounds,Rounds Completed,Difficulty,Player Name,Final Score\n';
      }

      let csv = 'Game Code,Date,Status,Total Rounds,Rounds Completed,Difficulty,Player Name,Final Score\n';
      
      history.forEach(game => {
        const baseInfo = [
          game.gameCode,
          game.completedDate,
          game.status,
          game.totalRounds === 'Infinite' ? 'Infinite' : game.totalRounds,
          game.roundsCompleted,
          game.difficulty
        ];

        if (game.players && game.players.length > 0) {
          game.players.forEach(player => {
            const row = [
              ...baseInfo,
              `"${player.name}"`, // Quotes in case name has commas
              player.finalScore !== undefined ? player.finalScore : 'N/A'
            ];
            csv += row.join(',') + '\n';
          });
        } else {
          // No players recorded
          const row = [...baseInfo, 'No Players', 'N/A'];
          csv += row.join(',') + '\n';
        }
      });

      return csv;
    } catch (error) {
      console.error('Error converting to CSV:', error);
      return 'Error generating CSV\n';
    }
  }

  // Export Firebase history to CSV file (download)
  async exportToCSV(filename = 'gamehistory.csv') {
    try {
      const csvContent = await this.convertToCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Game history exported to', filename);
      return true;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return false;
    }
  }

  // Get summary statistics
  async getStats() {
    try {
      const history = await this.getAllHistory();
      const total = history.length;
      const completed = history.filter(g => g.status === 'completed').length;
      const incomplete = total - completed;
      
      // Get difficulty breakdown
      const difficultyStats = history.reduce((acc, game) => {
        acc[game.difficulty] = (acc[game.difficulty] || 0) + 1;
        return acc;
      }, {});

      // Get recent games (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentGames = history.filter(game => {
        return new Date(game.completedDate) >= sevenDaysAgo;
      });
      
      return {
        totalGames: total,
        completedGames: completed,
        incompleteGames: incomplete,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%',
        difficultyBreakdown: difficultyStats,
        recentGames: recentGames.length,
        lastGameDate: history.length > 0 ? history[0].completedDate : null
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalGames: 0,
        completedGames: 0,
        incompleteGames: 0,
        completionRate: '0%',
        difficultyBreakdown: {},
        recentGames: 0,
        lastGameDate: null
      };
    }
  }

  // Delete a specific game
  async deleteGame(gameId) {
    try {
      await this.ensureInitialized();
      await this.historyRef.child(gameId).remove();
      console.log('Game deleted:', gameId);
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      return false;
    }
  }

  // Clear all history (use with caution!)
  async clearAllHistory() {
    try {
      await this.ensureInitialized();
      await this.historyRef.remove();
      console.log('All game history cleared');
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  // Listen for new games in real-time
  async onNewGame(callback) {
    await this.ensureInitialized();
    this.historyRef.on('child_added', (snapshot) => {
      const game = snapshot.val();
      game.id = snapshot.key;
      callback(game);
    });
  }

  // Stop listening for new games
  offNewGame() {
    if (this.historyRef) {
      this.historyRef.off('child_added');
    }
  }
}

// Create global instance
const firebaseGameHistory = new FirebaseGameHistoryTracker();

// Integration functions for your existing host.js
async function recordGameCompletion(gameId, players, playerScores, totalRounds, currentRoundNumber, difficulty, gameStartTime = null) {
  try {
    const playersData = Object.keys(players).map(playerId => ({
      name: players[playerId].name,
      finalScore: playerScores[playerId] || 0
    }));

    // Calculate game duration if start time provided
    let duration = null;
    if (gameStartTime) {
      duration = Math.round((Date.now() - gameStartTime) / 60000); // Duration in minutes
    }

    const gameData = {
      gameCode: gameId,
      totalRounds: totalRounds,
      roundsCompleted: currentRoundNumber - 1,
      difficulty: difficulty,
      players: playersData,
      status: 'completed',
      duration: duration
    };

    return await firebaseGameHistory.recordGame(gameData);
  } catch (error) {
    console.error('Error in recordGameCompletion:', error);
    // Don't throw the error to prevent breaking the game flow
    return null;
  }
}

async function recordGameAbandonment(gameId, players, playerScores, totalRounds, currentRoundNumber, difficulty, gameStartTime = null) {
  try {
    const playersData = Object.keys(players).map(playerId => ({
      name: players[playerId].name,
      finalScore: 'N/A'
    }));

    let duration = null;
    if (gameStartTime) {
      duration = Math.round((Date.now() - gameStartTime) / 60000);
    }

    const gameData = {
      gameCode: gameId,
      totalRounds: totalRounds,
      roundsCompleted: currentRoundNumber - 1,
      difficulty: difficulty,
      players: playersData,
      status: 'incomplete',
      duration: duration
    };

    return await firebaseGameHistory.recordGame(gameData);
  } catch (error) {
    console.error('Error in recordGameAbandonment:', error);
    return null;
  }
}

// Manual export function
async function downloadGameHistory() {
  try {
    const success = await firebaseGameHistory.exportToCSV();
    if (success) {
      const stats = await firebaseGameHistory.getStats();
      alert(`Game History Downloaded!\n\nTotal Games: ${stats.totalGames}\nCompleted: ${stats.completedGames}\nIncomplete: ${stats.incompleteGames}\nCompletion Rate: ${stats.completionRate}\nRecent Games: ${stats.recentGames}`);
    } else {
      alert('Error downloading game history. Please try again.');
    }
  } catch (error) {
    console.error('Error downloading game history:', error);
    alert('Error downloading game history. Please try again.');
  }
}

// Function to create history management panel
function createHistoryPanel() {
  const panel = document.createElement('div');
  panel.id = 'history-panel';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    border-radius: 10px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 1000;
    max-width: 200px;
  `;

  const title = document.createElement('h4');
  title.textContent = 'Game History';
  title.style.margin = '0 0 10px 0';
  panel.appendChild(title);

  const statsDiv = document.createElement('div');
  statsDiv.id = 'history-stats';
  statsDiv.textContent = 'Initializing...';
  panel.appendChild(statsDiv);

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export CSV';
  exportBtn.style.cssText = `
    background: #4CAF50;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 10px;
    width: 100%;
  `;
  exportBtn.addEventListener('click', downloadGameHistory);
  panel.appendChild(exportBtn);

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'Hide';
  toggleBtn.style.cssText = `
    background: #f44336;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 5px;
    width: 100%;
  `;
  
  let isVisible = true;
  toggleBtn.addEventListener('click', () => {
    isVisible = !isVisible;
    title.style.display = isVisible ? 'block' : 'none';
    statsDiv.style.display = isVisible ? 'block' : 'none';
    exportBtn.style.display = isVisible ? 'block' : 'none';
    toggleBtn.textContent = isVisible ? 'Hide' : 'Show';
  });
  panel.appendChild(toggleBtn);

  document.body.appendChild(panel);

  // Update stats periodically
  const updateStats = async () => {
    try {
      const stats = await firebaseGameHistory.getStats();
      statsDiv.innerHTML = `
        Total: ${stats.totalGames}<br>
        Completed: ${stats.completedGames}<br>
        Rate: ${stats.completionRate}<br>
        Recent: ${stats.recentGames}
      `;
    } catch (error) {
      statsDiv.innerHTML = 'Error loading stats';
      console.error('Error updating stats:', error);
    }
  };

  // Initialize Firebase and then update stats
  firebaseGameHistory.initialize().then(() => {
    updateStats();
    setInterval(updateStats, 30000); // Update every 30 seconds
  }).catch(error => {
    console.error('Failed to initialize Firebase Game History:', error);
    statsDiv.textContent = 'Init failed';
  });
}

// Initialize the history panel when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for Firebase to load
  setTimeout(() => {
    // Only show panel for hosts (you might want to add a condition here)
    if (document.getElementById('create-game')) {
      createHistoryPanel();
    }
  }, 1000);
});

// Auto-initialize Firebase Game History when the script loads
firebaseGameHistory.initialize().catch(error => {
  console.error('Failed to auto-initialize Firebase Game History:', error);
});