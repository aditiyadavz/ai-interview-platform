export const analyzeAnswer = (text) => {
  let confidence = Math.min(100, text.length * 1.5);

  const positive = ["clearly", "efficient", "optimal", "confident"];
  const negative = ["maybe", "not sure", "guess"];

  let sentiment = 50;

  positive.forEach((w) => {
    if (text.toLowerCase().includes(w)) sentiment += 10;
  });

  negative.forEach((w) => {
    if (text.toLowerCase().includes(w)) sentiment -= 10;
  });

  return {
    confidence: Math.min(confidence, 100),
    sentiment: Math.max(0, Math.min(sentiment, 100)),
  };
};
