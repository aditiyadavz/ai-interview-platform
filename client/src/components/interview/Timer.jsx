import { useEffect, useState } from "react";

const Timer = ({ duration, questionIndex, onTimeUp }) => {
  const [time, setTime] = useState(duration);

  useEffect(() => {
    setTime(duration);
  }, [questionIndex]);

  useEffect(() => {
    if (time === 0) {
      onTimeUp();
      return;
    }
    const t = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  return <div className="timer">⏱ {time}s</div>;
};

export default Timer;
