// Player.js - Logic for game players

// DOM Elements
const joinScreen = document.getElementById('join-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');
const answerSubmitted = document.getElementById('answer-submitted');
const resultsScreen = document.getElementById('results-screen');
const gameEndScreen = document.getElementById('game-end-screen');
const nameInput = document.getElementById('name-input');
const roomInput = document.getElementById('room-input');
const joinGameBtn = document.getElementById('join-game');
const joinError = document.getElementById('join-error');
const playerRoomCode = document.getElementById('player-room-code');
const playerName = document.getElementById('player-name');
const playerQuestion = document.getElementById('player-question');
const answerForm = document.getElementById('answer-form');
const submitAnswer = document.getElementById('submit-answer');
const playerResultHeader = document.getElementById('player-result-header');
const playerResults = document.getElementById('player-results');
const nextRoundBtn = document.getElementById('next-round-btn');
const waitingForPlayers = document.getElementById('waiting-for-players');

// Game setting display elements
const gameSettingsDisplay = document.getElementById('game-settings-display');
const playerRounds = document.getElementById('player-rounds');
const playerDifficulty = document.getElementById('player-difficulty');
const playerCurrentRound = document.getElementById('player-current-round');
const playerTotalRounds = document.getElementById('player-total-rounds');
const playerFinalResults = document.getElementById('player-final-results');

// Game variables
let gameId = null;
let playerId = null;
let playerData = null;
let currentRound = null;
let gameSettings = {};

// Join game
joinGameBtn.addEventListener('click', joinGame);

function joinGame() {
  const name = nameInput.value.trim();
  const roomCode = roomInput.value.trim().toUpperCase();
  
  if (!name) {
    showJoinError('Please enter your name');
    return;
  }
  
  if (!roomCode || roomCode.length !== 4) {
    showJoinError('Please enter a valid room code');
    return;
  }
  
  // Check if game exists
  db.ref(`games/${roomCode}`).once('value')
    .then((snapshot) => {
      const gameData = snapshot.val();
      
      if (!gameData) {
        showJoinError('Game not found');
        return;
      }
      
      if (gameData.status !== 'waiting') {
        showJoinError('Game already in progress');
        return;
      }
      
      // Join the game
      gameId = roomCode;
      playerId = db.ref(`games/${gameId}/players`).push().key;
      
      playerData = {
        name: name,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      return db.ref(`games/${gameId}/players/${playerId}`).set(playerData);
    })
    .then(() => {
      if (gameId) {
        // Set up game listeners
        setupGameListeners();
        
        // Show waiting screen
        joinScreen.classList.add('hidden');
        waitingScreen.classList.remove('hidden');
        playerRoomCode.textContent = gameId;
        playerName.textContent = playerData.name;
      }
    })
    .catch((error) => {
      showJoinError('Error joining game');
      console.error(error);
    });
}

function setupGameListeners() {
  // Listen for game status changes
  db.ref(`games/${gameId}/status`).on('value', (snapshot) => {
    const status = snapshot.val();
    
    if (status === 'active') {
      waitingScreen.classList.add('hidden');
      // Game screen will be shown when a round is available
    }
  });
  
  // Listen for game settings (rounds and difficulty)
  db.ref(`games/${gameId}`).on('value', (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
      gameSettings = gameData;
      
      // Update game settings display in waiting screen
      if (gameData.totalRounds && gameData.difficulty) {
        playerRounds.textContent = gameData.totalRounds;
        playerDifficulty.textContent = gameData.difficulty;
        playerTotalRounds.textContent = gameData.totalRounds;
        gameSettingsDisplay.classList.remove('hidden');
      }
      
      // Update current round number
      if (gameData.currentRoundNumber) {
        playerCurrentRound.textContent = gameData.currentRoundNumber;
      }
      
      // Check if game has ended
      if (gameData.totalRounds !== 'Infinite' && 
          gameData.currentRoundNumber && 
          gameData.currentRoundNumber > gameData.totalRounds &&
          gameData.playerScores) {
        showGameEnd(gameData.playerScores, gameData.players);
      }
    }
  });
  
  // Listen for current round
  db.ref(`games/${gameId}/currentRound`).on('value', (snapshot) => {
    currentRound = snapshot.val();
    
    if (currentRound) {
      // Show game screen
      gameScreen.classList.remove('hidden');
      answerSubmitted.classList.add('hidden');
      resultsScreen.classList.add('hidden');
      gameEndScreen.classList.add('hidden');
      
      // Display question
      playerQuestion.textContent = currentRound.question;
      
      // Create form for answering
      createAnswerForm();
    }
  });
  
  // Listen for round results
  db.ref(`games/${gameId}/roundResult`).on('value', (snapshot) => {
    const roundResult = snapshot.val();
    if (roundResult) {
      // Update the player result header based on consensus status
      if (roundResult.consensusStatus === "common") {
        playerResultHeader.textContent = "That's Common Sense!";
        playerResultHeader.className = "success";
      } else if (roundResult.consensusStatus === "partial") {
        playerResultHeader.textContent = "Partial Sense...";
        playerResultHeader.className = "partial";
      } else {
        playerResultHeader.textContent = "Nonsensical!";
        playerResultHeader.className = "failure";
      }
    }
  });
  
  // Listen for when results are ready (triggered by host)
  db.ref(`games/${gameId}/roundResult`).on('value', (snapshot) => {
    const roundResult = snapshot.val();
    if (roundResult) {
      // Update the player result header based on consensus status
      if (roundResult.consensusStatus === "common") {
        playerResultHeader.textContent = "That's Common Sense!";
        playerResultHeader.className = "success";
      } else if (roundResult.consensusStatus === "partial") {
        playerResultHeader.textContent = "Partial Sense...";
        playerResultHeader.className = "partial";
      } else {
        playerResultHeader.textContent = "Nonsensical!";
        playerResultHeader.className = "failure";
      }
      
      // Check if we're currently on the answer submitted screen
      if (!answerSubmitted.classList.contains('hidden')) {
        // Results are ready and we're currently on the "answer submitted" screen
        // Get the answers and players to show results
        Promise.all([
          db.ref(`games/${gameId}/playerAnswers`).once('value'),
          db.ref(`games/${gameId}/players`).once('value')
        ]).then(([answersSnapshot, playersSnapshot]) => {
          const answers = answersSnapshot.val() || {};
          const players = playersSnapshot.val() || {};
          
          if (answers[playerId]) {
            showPlayerResults(answers, players);
          }
        });
      }
    }
  });
  
  // Listen for player ready status to update UI
  db.ref(`games/${gameId}/playerReadyForNext`).on('value', (snapshot) => {
    const readyPlayers = snapshot.val() || {};
    
    if (readyPlayers[playerId]) {
      // This player is ready, show waiting message
      nextRoundBtn.classList.add('hidden');
      waitingForPlayers.classList.remove('hidden');
    }
  });
}

// Create form for answering the question
function createAnswerForm() {
  answerForm.innerHTML = '';
  
  if (!currentRound || !currentRound.senses) return;
  
  currentRound.senses.forEach(sense => {
    const senseGroup = document.createElement('div');
    senseGroup.className = 'sense-group';
    
    const senseLabel = document.createElement('label');
    senseLabel.className = 'sense-label';
    senseLabel.textContent = sense;
    senseGroup.appendChild(senseLabel);
    
    const senseSelect = document.createElement('select');
    senseSelect.className = 'sense-select';
    senseSelect.dataset.sense = sense;
    
    const options = senseOptions[sense] || [];
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option || `Select ${sense}`;
      senseSelect.appendChild(optionElement);
    });
    
    senseGroup.appendChild(senseSelect);
    answerForm.appendChild(senseGroup);
  });
  
  // Show submit button
  submitAnswer.classList.remove('hidden');
}

// Submit answer
submitAnswer.addEventListener('click', submitPlayerAnswer);

function submitPlayerAnswer() {
  if (!currentRound || !playerId || !gameId) return;
  
  // Collect answers from form
  const answers = {};
  const selects = answerForm.querySelectorAll('select');
  
  let allAnswered = true;
  
  selects.forEach(select => {
    const sense = select.dataset.sense;
    const value = select.value;
    
    if (!value) {
      allAnswered = false;
      select.style.borderColor = '#e74c3c';
    } else {
      select.style.borderColor = '#ddd';
      answers[sense] = value;
    }
  });
  
  if (!allAnswered) {
    alert('Please answer all questions');
    return;
  }
  
  // Submit answer to Firebase
  db.ref(`games/${gameId}/playerAnswers/${playerId}`).set(answers)
    .then(() => {
      // Show submitted screen
      gameScreen.classList.add('hidden');
      answerSubmitted.classList.remove('hidden');
    })
    .catch((error) => {
      alert('Error submitting answer');
      console.error(error);
    });
}

// Show player results
function showPlayerResults(allAnswers, allPlayers) {
  // Hide other screens
  gameScreen.classList.add('hidden');
  answerSubmitted.classList.add('hidden');
  resultsScreen.classList.remove('hidden');
  
  // Check if game is over
  const isGameOver = (gameSettings.totalRounds !== 'Infinite' && 
                     gameSettings.currentRoundNumber >= gameSettings.totalRounds);
  
  if (isGameOver) {
    // Game is over - show final results message instead of next round button
    nextRoundBtn.classList.add('hidden');
    waitingForPlayers.classList.add('hidden');
    
    // Create or update final results message
    let finalMessage = document.getElementById('final-results-message');
    if (!finalMessage) {
      finalMessage = document.createElement('div');
      finalMessage.id = 'final-results-message';
      finalMessage.className = 'final-results-message';
      nextRoundBtn.parentNode.insertBefore(finalMessage, nextRoundBtn);
    }
    finalMessage.innerHTML = '<h3>🏆 Final Results on Host Screen! 🏆</h3>';
    finalMessage.classList.remove('hidden');
  } else {
    // Game continues - show next round button
    nextRoundBtn.classList.remove('hidden');
    waitingForPlayers.classList.add('hidden');
    
    // Hide final results message if it exists
    const finalMessage = document.getElementById('final-results-message');
    if (finalMessage) {
      finalMessage.classList.add('hidden');
    }
  }
  
  // Show player's answers (existing code continues...)
  playerResults.innerHTML = '';
  const myAnswers = allAnswers[playerId] || {};
  
  for (const sense in myAnswers) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    // Check if this sense has a match with all other players
    let matchCount = 0;
    let totalPlayers = 0;
    
    for (const pid in allAnswers) {
      if (pid === playerId) continue;
      totalPlayers++;
      
      if (allAnswers[pid][sense] === myAnswers[sense]) {
        matchCount++;
      }
    }
    
    const allMatch = (matchCount === totalPlayers && totalPlayers > 0);
    const someMatch = (matchCount > 0);
    
    resultItem.classList.add(allMatch ? 'match' : someMatch ? 'partial-match' : 'mismatch');
    
    // Show match information
    let matchText = '';
    if (allMatch) {
      matchText = ' (Everyone agreed!)';
    } else if (someMatch) {
      matchText = ` (${matchCount} player${matchCount !== 1 ? 's' : ''} agreed)`;
    } else {
      matchText = ' (No one else agreed)';
    }
    
    resultItem.textContent = `${sense}: ${myAnswers[sense]}${matchText}`;
    playerResults.appendChild(resultItem);
  }
}

// Show game end screen
function showGameEnd(playerScores, allPlayers) {
  // Hide other screens
  gameScreen.classList.add('hidden');
  answerSubmitted.classList.add('hidden');
  resultsScreen.classList.add('hidden');
  gameEndScreen.classList.remove('hidden');
  
  // Create final leaderboard
  const sortedPlayers = Object.keys(playerScores || {}).sort((a, b) => {
    return (playerScores[b] || 0) - (playerScores[a] || 0);
  });
  
  let finalHTML = `
    <h3>Final Standings</h3>
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Final Score</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  sortedPlayers.forEach((pid, index) => {
    const playerName = allPlayers && allPlayers[pid] ? allPlayers[pid].name : 'Unknown';
    const playerScore = playerScores[pid] || 0;
    const rank = index + 1;
    
    let rankClass = '';
    if (rank === 1) rankClass = 'first-place';
    else if (rank === 2) rankClass = 'second-place';
    else if (rank === 3) rankClass = 'third-place';
    
    // Highlight current player
    let playerClass = '';
    if (pid === playerId) {
      playerClass = 'current-player';
    }
    
    finalHTML += `
      <tr class="${rankClass} ${playerClass}">
        <td>${rank}</td>
        <td>${playerName}${pid === playerId ? ' (You)' : ''}</td>
        <td>${playerScore}</td>
      </tr>`;
  });
  
  finalHTML += '</tbody></table>';
  playerFinalResults.innerHTML = finalHTML;
}

// Helper functions
function showJoinError(message) {
  joinError.textContent = message;
  joinError.classList.remove('hidden');
  
  setTimeout(() => {
    joinError.classList.add('hidden');
  }, 3000);
}

// Auto-capitalization for room code
roomInput.addEventListener('input', function() {
  this.value = this.value.toUpperCase();
});