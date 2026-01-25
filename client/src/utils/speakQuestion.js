export const speakQuestion = (text) => {
  if (!window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.includes("en"));
  if (englishVoice) utterance.voice = englishVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};
