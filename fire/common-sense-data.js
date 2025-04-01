// This file represents the parsed CSV data
const commonSenseData = {
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

// Sense options
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
