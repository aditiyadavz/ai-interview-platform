export const analyzeAnswer = (text) => {
  const confidence = Math.min(100, text.length * 1.5);

  let sentiment = 50;
  ["clear", "efficient", "confident"].forEach((w) => {
    if (text.toLowerCase().includes(w)) sentiment += 10;
  });

  ["maybe", "not sure"].forEach((w) => {
    if (text.toLowerCase().includes(w)) sentiment -= 10;
  });

  return {
    confidence,
    sentiment: Math.max(0, Math.min(sentiment, 100)),
  };
};
