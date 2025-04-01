// Function to parse CSV text
function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(header => header.trim().replace(/^"(.*)"$/, '$1'));
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    // Handle values that might contain commas within quotes
    const row = {};
    let currentPosition = 0;
    let valueStart = 0;
    let insideQuotes = false;
    
    headers.forEach(header => {
      // Find next value
      while (currentPosition < lines[i].length) {
        if (lines[i][currentPosition] === '"') {
          insideQuotes = !insideQuotes;
        } else if (lines[i][currentPosition] === ',' && !insideQuotes) {
          // Found end of value
          let value = lines[i].substring(valueStart, currentPosition).trim();
          // Remove surrounding quotes if present
          value = value.replace(/^"(.*)"$/, '$1');
          row[header] = value;
          
          valueStart = currentPosition + 1;
          currentPosition++;
          break;
        }
        currentPosition++;
      }
      
      // If we reached the end of the line
      if (currentPosition >= lines[i].length) {
        let value = lines[i].substring(valueStart).trim();
        value = value.replace(/^"(.*)"$/, '$1');
        row[header] = value;
      }
    });
    
    records.push(row);
  }
  
  return records;
}

// Function to load and process the CSV file
async function loadCommonSenseData() {
  try {
    // Fetch the CSV file
    const response = await fetch('common_sense.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Parse the CSV content
    const records = parseCSV(csvText);
    
    // Organize data into categories, modifiers, and objects
    const data = {
      categories: [],
      modifiers: [],
      objects: []
    };
    
    // Process each record from the CSV
    records.forEach(record => {
      const item = {
        text: record.text,
        deck: record.deck,
        count: parseInt(record.count, 10)
      };
      
      // Sort into appropriate category based on deck value
      if (record.deck.startsWith('1 -')) {
        data.categories.push(item);
      } else if (record.deck.startsWith('2-')) {
        data.modifiers.push(item);
      } else if (record.deck.startsWith('3-')) {
        data.objects.push(item);
      }
    });
    
    return data;
  } catch (error) {
    console.error('Error loading common sense data:', error);
    // If loading fails, return the original hardcoded data for fallback
    return {
      categories: [
        { text: "What COLOR and TASTE are", deck: "1 - Category", count: 5 },
        { text: "What COLOR and TEXTURE are", deck: "1 - Category", count: 4 },
        { text: "What COLOR and SMELL are", deck: "1 - Category", count: 4 },
        { text: "What TASTE and TEXTURE are", deck: "1 - Category", count: 3 },
        { text: "What COLOR, TASTE and SMELL are", deck: "1 - Category", count: 2 },
        { text: "What COLOR and VOLUME are", deck: "1 - Category", count: 2 }
      ],
      modifiers: [
        { text: "the MOST", deck: "2-Modifier", count: 6 },
        { text: "the LEAST", deck: "2-Modifier", count: 5 },
        { text: "the SECOND MOST", deck: "2-Modifier", count: 4 }
      ],
      objects: [
        { text: "SADNESS", deck: "3-Object", count: 4 },
        { text: "ANGER", deck: "3-Object", count: 4 },
        { text: "JOY", deck: "3-Object", count: 4 },
        { text: "FEAR", deck: "3-Object", count: 3 },
        { text: "LOVE", deck: "3-Object", count: 3 },
        { text: "ANXIETY", deck: "3-Object", count: 3 },
        { text: "PEACE", deck: "3-Object", count: 2 },
        { text: "ENVY", deck: "3-Object", count: 2 },
        { text: "BOREDOM", deck: "3-Object", count: 2 }
      ]
    };
  }
}

// Initialize with original hardcoded data as fallback
let commonSenseData = {
  categories: [
    { text: "What COLOR and TASTE are", deck: "1 - Category", count: 5 },
    { text: "What COLOR and TEXTURE are", deck: "1 - Category", count: 4 },
    { text: "What COLOR and SMELL are", deck: "1 - Category", count: 4 },
    { text: "What TASTE and TEXTURE are", deck: "1 - Category", count: 3 },
    { text: "What COLOR, TASTE and SMELL are", deck: "1 - Category", count: 2 },
    { text: "What COLOR and VOLUME are", deck: "1 - Category", count: 2 }
  ],
  modifiers: [
    { text: "the MOST", deck: "2-Modifier", count: 6 },
    { text: "the LEAST", deck: "2-Modifier", count: 5 },
    { text: "the SECOND MOST", deck: "2-Modifier", count: 4 }
  ],
  objects: [
    { text: "SADNESS", deck: "3-Object", count: 4 },
    { text: "ANGER", deck: "3-Object", count: 4 },
    { text: "JOY", deck: "3-Object", count: 4 },
    { text: "FEAR", deck: "3-Object", count: 3 },
    { text: "LOVE", deck: "3-Object", count: 3 },
    { text: "ANXIETY", deck: "3-Object", count: 3 },
    { text: "PEACE", deck: "3-Object", count: 2 },
    { text: "ENVY", deck: "3-Object", count: 2 },
    { text: "BOREDOM", deck: "3-Object", count: 2 }
  ]
};

// Flag to track if data is loaded
let dataLoaded = false;

// Function to initialize the game
async function initializeGame() {
  try {
    // Load data from CSV
    const loadedData = await loadCommonSenseData();
    
    // Only update if we got valid data
    if (loadedData.categories.length > 0 && 
        loadedData.modifiers.length > 0 && 
        loadedData.objects.length > 0) {
      commonSenseData = loadedData;
      console.log('Common sense data loaded successfully from CSV');
      logImportedData();
    } else {
      console.warn('CSV data was empty or invalid, using fallback data');
    }
    
    dataLoaded = true;
    
    // Now that data is loaded, you can safely start the game
    startNewRound(); // Call your startNewRound function here
  } catch (error) {
    console.error('Failed to load common sense data:', error);
    dataLoaded = true; // Set to true anyway as we have fallback data
    startNewRound(); // Use fallback data
  }
}

// Sense options remain the same
const senseOptions = {
  "Color": ["", "Red", "Blue", "Yellow", "Green", "Purple", "Orange", "Black", "White", "Pink", "Brown"],
  "Texture": ["", "Bumpy", "Sharp", "Sticky", "Smooth", "Slippery", "Squishy", "Firm", "Fluffy"],
  "Taste": ["", "Bitter", "Sour", "Salty", "Umami", "Sweet", "Spicy"],
  "Smell": ["", "Natural", "Neutral", "Pungent", "Chemical"],
  "Volume": ["", "Loud", "Quiet"]
};

// Helper function to extract senses from a category string
function getSensesFromCategory(category) {
  const senses = [];
  const categoryText = category.text.toUpperCase();
  
  if (categoryText.includes("COLOR")) senses.push("Color");
  if (categoryText.includes("TEXTURE")) senses.push("Texture");
  if (categoryText.includes("TASTE")) senses.push("Taste");
  if (categoryText.includes("SMELL")) senses.push("Smell");
  if (categoryText.includes("VOLUME")) senses.push("Volume");
  
  return senses;
}

// Weighted random selection function
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.count, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.count;
    if (random < 0) {
      return item;
    }
  }
  
  return items[0]; // Fallback
}

function logImportedData() {
  console.log("=== IMPORTED COMMON SENSE DATA ===");
  console.log("Categories:", commonSenseData.categories);
  console.log("Modifiers:", commonSenseData.modifiers);
  console.log("Objects:", commonSenseData.objects);
  
  // Log the total count of items in each category
  console.log("Total categories:", commonSenseData.categories.length);
  console.log("Total modifiers:", commonSenseData.modifiers.length);
  console.log("Total objects:", commonSenseData.objects.length);
  
  // Detailed logging of each item
  console.log("\n=== DETAILED DATA ===");
  
  console.log("\nCATEGORIES:");
  commonSenseData.categories.forEach((item, index) => {
    console.log(`  ${index + 1}. "${item.text}" (deck: ${item.deck}, count: ${item.count})`);
  });
  
  console.log("\nMODIFIERS:");
  commonSenseData.modifiers.forEach((item, index) => {
    console.log(`  ${index + 1}. "${item.text}" (deck: ${item.deck}, count: ${item.count})`);
  });
  
  console.log("\nOBJECTS:");
  commonSenseData.objects.forEach((item, index) => {
    console.log(`  ${index + 1}. "${item.text}" (deck: ${item.deck}, count: ${item.count})`);
  });
}

// Safe version of startNewRound that checks data is loaded
function startNewRound() {
  if (!dataLoaded) {
    console.log("Data not loaded yet, waiting...");
    setTimeout(startNewRound, 100); // Try again in 100ms
    return;
  }
  
  // Your existing startNewRound code here
  // Now it's safe to use commonSenseData
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', initializeGame);