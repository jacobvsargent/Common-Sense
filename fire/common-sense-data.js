// Import the necessary module to read files
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Function to load and parse the CSV file
function loadCommonSenseData(filePath) {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV content
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
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

// Load the data from the CSV file
const commonSenseData = loadCommonSenseData(path.join(__dirname, 'common_sense.csv'));

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