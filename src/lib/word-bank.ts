// Word bank for Pictionary game
export const WORD_BANK = [
  // Animals
  'cat', 'dog', 'elephant', 'lion', 'tiger', 'bear', 'rabbit', 'mouse', 'bird', 'fish',
  'cow', 'pig', 'sheep', 'horse', 'chicken', 'duck', 'goose', 'owl', 'eagle', 'shark',
  
  // Objects
  'car', 'house', 'tree', 'book', 'phone', 'computer', 'chair', 'table', 'bed', 'door',
  'window', 'clock', 'camera', 'bicycle', 'airplane', 'boat', 'train', 'bus', 'truck', 'motorcycle',
  
  // Food
  'pizza', 'hamburger', 'sandwich', 'cake', 'cookie', 'apple', 'banana', 'orange', 'grape', 'strawberry',
  'bread', 'cheese', 'milk', 'coffee', 'tea', 'soup', 'salad', 'ice cream', 'chocolate', 'candy',
  
  // Activities
  'dancing', 'singing', 'reading', 'writing', 'drawing', 'painting', 'swimming', 'running', 'jumping', 'sleeping',
  'cooking', 'eating', 'drinking', 'laughing', 'crying', 'thinking', 'talking', 'listening', 'watching', 'playing',
  
  // Places
  'beach', 'mountain', 'forest', 'city', 'school', 'hospital', 'restaurant', 'store', 'library', 'park',
  'zoo', 'museum', 'theater', 'church', 'office', 'kitchen', 'bedroom', 'bathroom', 'garden', 'farm',
  
  // Weather & Nature
  'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'fire', 'water', 'earth',
  'flower', 'grass', 'leaf', 'rock', 'sand', 'ice', 'rainbow', 'lightning', 'thunder', 'storm',
  
  // Body Parts
  'head', 'eye', 'nose', 'mouth', 'ear', 'hand', 'foot', 'leg', 'arm', 'finger',
  'toe', 'hair', 'tooth', 'tongue', 'chest', 'back', 'stomach', 'knee', 'elbow', 'shoulder',
  
  // Emotions
  'happy', 'sad', 'angry', 'excited', 'scared', 'surprised', 'confused', 'worried', 'proud', 'embarrassed',
  'jealous', 'nervous', 'calm', 'frustrated', 'disappointed', 'grateful', 'hopeful', 'lonely', 'confident', 'shy'
];

// Get a random word from the word bank
export function getRandomWord(): string {
  const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
  return WORD_BANK[randomIndex];
}

// Get multiple random words (for word selection)
export function getRandomWords(count: number = 3): string[] {
  const shuffled = [...WORD_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
