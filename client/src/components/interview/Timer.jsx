import { useEffect, useState } from "react";
import "../../styles/interview.css";

const Timer = ({ duration, onTimeUp }) => {
  const [time, setTime] = useState(duration);

  useEffect(() => {
    if (time === 0) {
      onTimeUp();
      return;
    }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time]);

  return <div className="timer">⏱ {time}s</div>;
};

export default Timer;
