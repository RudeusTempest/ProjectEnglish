import { getTranslation, builtInDictionary } from './dictionary';

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Helper to get random wrong options (Hebrew)
const getWrongOptionsHe = (correctHe, count = 3) => {
  const allHeWords = Object.values(builtInDictionary).map(v => v.he);
  const filtered = allHeWords.filter(w => w !== correctHe && w !== "לא ידוע");
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, count);
};

// Helper to get random wrong options (English)
const getWrongOptionsEn = (correctEn, count = 3) => {
  const allEnWords = Object.keys(builtInDictionary);
  const filtered = allEnWords.filter(w => w !== correctEn);
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, count);
};

export const generateQuiz = (inputText) => {
  if (!inputText.trim()) return null;

  // Split by newline or comma
  const rawWords = inputText.split(/[\n,]+/).map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
  const uniqueWords = [...new Set(rawWords)];

  if (uniqueWords.length === 0) return null;

  const translatedWords = uniqueWords.map(w => getTranslation(w));
  const shuffled = shuffleArray(translatedWords);

  // Distribute into 4 sections
  const sections = { A: [], B: [], C: [], D: [] };
  const keys = ['A', 'B', 'C', 'D'];
  
  shuffled.forEach((wordObj, index) => {
    sections[keys[index % 4]].push(wordObj);
  });

  // Prepare Section A: Multiple choice (En -> He)
  const sectionA = sections.A.map((item, id) => {
    const wrongOpts = getWrongOptionsHe(item.he, 3);
    const options = shuffleArray([item.he, ...wrongOpts]);
    return {
      id: `A_${id}`,
      type: 'MULTIPLE_CHOICE',
      word: item.word,
      correctAnswer: item.he,
      options
    };
  });

  // Prepare Section B: Fill in the blank (Sentence)
  const sectionB = sections.B.map((item, id) => {
    return {
      id: `B_${id}`,
      type: 'FILL_IN_BLANK',
      word: item.word, // The answer they must type
      sentence: item.ex,
      he: item.he
    };
  });

  // Prepare Section C: Translate He -> En
  const sectionC = sections.C.map((item, id) => {
    return {
      id: `C_${id}`,
      type: 'TRANSLATE',
      he: item.he,
      correctAnswer: item.word
    };
  });

  // Prepare Section D: Sentence recognition (Missing word from options)
  const sectionD = sections.D.map((item, id) => {
    const wrongOpts = getWrongOptionsEn(item.word, 3);
    const options = shuffleArray([item.word, ...wrongOpts]);
    return {
      id: `D_${id}`,
      type: 'SENTENCE_RECOGNITION',
      sentence: item.ex,
      correctAnswer: item.word,
      options
    };
  });

  return { sectionA, sectionB, sectionC, sectionD };
};
