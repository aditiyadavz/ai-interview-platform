export const speak = (text) => {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1;
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
};
