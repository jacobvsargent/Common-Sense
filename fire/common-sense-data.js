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
    // Return empty structure if file loading fails
    return { categories: [], modifiers: [], objects: [] };
  }
}

// Define common sense data first with placeholder
let commonSenseData = {
  categories: [],
  modifiers: [],
  objects: []
};

// Load the data immediately
(async function() {
  try {
    commonSenseData = await loadCommonSenseData();
    console.log('Common sense data loaded successfully');
    
    // You might want to trigger any initialization functions here
    // that depend on the data being loaded
  } catch (error) {
    console.error('Failed to load common sense data:', error);
  }
})();

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