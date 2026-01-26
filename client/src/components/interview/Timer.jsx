import { useEffect, useState } from "react";

const Timer = ({ duration, questionIndex, onTimeUp }) => {
  const [time, setTime] = useState(duration);

  useEffect(() => {
    setTime(duration);
  }, [questionIndex, duration]);

  useEffect(() => {
    if (time === 0) {
      onTimeUp();
      return;
    }
    const timer = setTimeout(() => setTime((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [time, onTimeUp]);

  const percentage = (time / duration) * 100;

  return (
    <div className="top-right">
      <div className="timer-card">
        <div className="timer-label">TIME LEFT</div>

        <div className={`timer-time ${time <= 10 ? "danger" : ""}`}>
          {Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}
        </div>

        <div className="timer-bar">
          <div
            className="timer-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {time <= 10 && <span className="timer-warning">Hurry up!</span>}
      </div>
    </div>
  );
};

export default Timer;
