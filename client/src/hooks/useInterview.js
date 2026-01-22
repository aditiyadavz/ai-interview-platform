export const analyzeAnswer = (text) => {
  const words = text.split(" ").length;

  const confidence =
    words > 80 ? "High" : words > 40 ? "Medium" : "Low";

  const sentiment = text.includes("problem") || text.includes("difficult")
    ? "Neutral"
    : "Positive";

  return { confidence, sentiment };
};
