let category = [];
let modifier = [];
let object = [];
let correctGuesses = 0;
let incorrectGuesses = 0;
let playerData = {};
let dataLoaded = false;

// Load data from CSV
console.log("Attempting to load CSV file...");
Papa.parse("common_sense.csv", {
    download: true,
    header: true,
    complete: function(results) {
        console.log("CSV parse complete:", results.data); // Debug message
        results.data.forEach(row => {
            console.log("Processing row:", row); // Debug message
            if (row.deck && row.count) {
                let count = parseInt(row.count); // Convert count to an integer
                if (row.deck.includes("Category")) { // Check if row.deck includes "Category"
                    for (let i = 0; i < count; i++) {
                        category.push(row.text);
                    }
                } else if (row.deck.includes("Modifier")) { // Check if row.deck includes "Modifier"
                    for (let i = 0; i < count; i++) {
                        modifier.push(row.text);
                    }
                } else if (row.deck.includes("Object")) { // Check if row.deck includes "Object"
                    for (let i = 0; i < count; i++) {
                        object.push(row.text);
                    }
                }
            }
        });
        dataLoaded = true;
        console.log("Data loaded successfully");
        console.log("Categories:", category); // Debug message
        console.log("Modifiers:", modifier); // Debug message
        console.log("Objects:", object); // Debug message
    },
    error: function(err) {
        console.error("Error parsing CSV:", err);
    }
});

// Function to update the message box dynamically
function updateMessage(stage) {
    const messages = {
        start: "Draw cards to start a new round!",
        selecting: "Players, make your selections...",
        locked: "Click Check to see if you've got Common Sense!"
    };
    document.getElementById("result").textContent = messages[stage];
}

function drawCards() {
    updateMessage("selecting");
    if (category.length && modifier.length && object.length) {
        const result = document.getElementById("result");
        result.textContent = `${randomChoice(category)} ${randomChoice(modifier)} ${randomChoice(object)}`;
    } else {
        console.error("CSV data has not been loaded yet.");
        alert("Data not loaded yet. Please wait a moment and try again.");
    }
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function createPlayerWindow(playerName) {
    const playerWindow = document.createElement("div");
    playerWindow.className = "player-window";
    playerWindow.id = playerName;

    const title = document.createElement("h2");
    title.textContent = playerName;
    playerWindow.appendChild(title);

    const attributes = {
        "Color": ["", "Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black", "White", "Pink", "Brown"],
        "Texture": ["", "Bumpy", "Sharp", "Sticky", "Smooth", "Slippery", "Squishy", "Firm", "Fluffy"],
        "Taste": ["", "Bitter", "Sour", "Salty", "Savory", "Sweet", "Spicy"],
        "Smell": ["", "Natural", "Neutral", "Pungent", "Chemical"],
        "Volume": ["", "Loud", "Quiet"]
    };

    const varsDict = {};

    const lockButton = document.createElement("button");
    lockButton.textContent = "Lock In";
    lockButton.onclick = () => toggleLock(lockButton, playerWindow, playerName);
    playerWindow.appendChild(lockButton);

    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear";
    clearButton.onclick = () => clearSelections(varsDict, attributes);
    playerWindow.appendChild(clearButton);

    const gridContainer = document.createElement("div");
    gridContainer.className = "grid-container";
    for (const label in attributes) {
        const gridItem = document.createElement("div");
        gridItem.className = "grid-item";

        const labelElement = document.createElement("label");
        labelElement.textContent = label;
        gridItem.appendChild(labelElement);

        const select = document.createElement("select");
        attributes[label].forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        varsDict[label] = select;
        gridItem.appendChild(select);

        gridContainer.appendChild(gridItem);
    }
    playerWindow.appendChild(gridContainer);

    playerData[playerName] = { vars: varsDict, locked: false, lockButton, window: playerWindow };

    document.getElementById("players").appendChild(playerWindow);
}

function clearSelections(varsDict, attributes) {
    for (const label in varsDict) {
        varsDict[label].value = attributes[label][0];
        varsDict[label].classList.remove("match", "no-match"); // Remove shading
    }
}

function toggleLock(button, window, playerName) {
    if (Object.values(playerData).every(p => p.locked)) {
        updateMessage("locked");
    }
    const player = playerData[playerName];
    player.locked = !player.locked;
    if (player.locked) {
        window.classList.add("locked");
        for (const key in player.vars) {
            player.vars[key].style.display = "none"; // Hide selections
        }
        button.textContent = "Locked In!";
    } else {
        window.classList.remove("locked");
        for (const key in player.vars) {
            player.vars[key].style.display = "block"; // Show selections
        }
        button.textContent = "Lock In";
    }
    document.getElementById("check-button").disabled = !Object.values(playerData).every(p => p.locked);
}


function checkMatch() {
    const player1Choices = Object.values(playerData["Player 1"].vars).map(select => select.value);
    const player2Choices = Object.values(playerData["Player 2"].vars).map(select => select.value);

    const match = player1Choices.every((choice, index) => choice === player2Choices[index]);

    // Update the correct or incorrect guess counter
    if (match) {
        correctGuesses++;
    } else {
        incorrectGuesses++;
    }

    // Update the display for correct/incorrect count
    document.getElementById("correct-label").textContent = `Correct: ${correctGuesses}`;
    document.getElementById("incorrect-label").textContent = `Incorrect: ${incorrectGuesses}`;

    // Apply shading based on match
    Object.keys(playerData["Player 1"].vars).forEach(key => {
        const p1Value = playerData["Player 1"].vars[key].value;
        const p2Value = playerData["Player 2"].vars[key].value;

        if (p1Value === "" || p2Value === "") {
            playerData["Player 1"].vars[key].classList.remove("match", "no-match");
            playerData["Player 2"].vars[key].classList.remove("match", "no-match");
        } else if (p1Value === p2Value) {
            playerData["Player 1"].vars[key].classList.add("match");
            playerData["Player 2"].vars[key].classList.add("match");
            playerData["Player 1"].vars[key].classList.remove("no-match");
            playerData["Player 2"].vars[key].classList.remove("no-match");
        } else {
            playerData["Player 1"].vars[key].classList.add("no-match");
            playerData["Player 2"].vars[key].classList.add("no-match");
            playerData["Player 1"].vars[key].classList.remove("match");
            playerData["Player 2"].vars[key].classList.remove("match");
        }
    });

    /*
    // Unlock players and make selections visible again
    Object.values(playerData).forEach(player => {
        player.locked = false;
        player.lockButton.textContent = "Lock In";

        for (const key in player.vars) {
            player.vars[key].style.display = "block"; // Show selections
            player.vars[key].classList.remove("match", "no-match"); // Remove previous shading
        }
    });

    // Clear selections and reset lock state
    
    Object.values(playerData).forEach(player => {
        clearSelections(player.vars, {
            "Color": ["", "Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black", "White", "Pink", "Brown"],
            "Texture": ["", "Bumpy", "Sharp", "Sticky", "Smooth", "Slippery", "Squishy", "Firm", "Fluffy"],
            "Taste": ["", "Bitter", "Sour", "Salty", "Savory", "Sweet", "Spicy"],
            "Smell": ["", "Natural", "Neutral", "Pungent", "Chemical"],
            "Volume": ["", "Loud", "Quiet"]
        });
        player.locked = false;
    });
    

    // Reset the game state and disable the check button until a new round starts
    document.getElementById("check-button").disabled = true;
    updateMessage("start");
    */
}


createPlayerWindow("Player 1");
createPlayerWindow("Player 2");
