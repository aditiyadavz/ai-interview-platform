export const analyzeAnswer = (transcript, duration = 60) => {
  if (!transcript) {
    return {
      confidence: 0,
      clarity: 0,
      sentiment: 50,
      score: 0,
    };
  }

  const words = transcript.trim().split(/\s+/).length;
  const wpm = (words / duration) * 60;

  // Confidence
  const confidence = Math.min(100, Math.round((words / 120) * 100));

  // Clarity
  let clarity = 50;
  if (wpm >= 110 && wpm <= 150) clarity = 90;
  else if (wpm >= 90) clarity = 70;

  // Sentiment
  const positiveWords = [
    "confident",
    "experience",
    "success",
    "learned",
    "improved",
  ];

  let sentiment = 50;
  positiveWords.forEach((word) => {
    if (transcript.toLowerCase().includes(word)) sentiment += 5;
  });

  sentiment = Math.min(100, sentiment);

  const score = Math.round((confidence + clarity + sentiment) / 3);

  return { confidence, clarity, sentiment, score };
};
