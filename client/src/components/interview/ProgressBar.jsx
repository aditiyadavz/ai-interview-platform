import "../../styles/interview.css";

const ProgressBar = ({ current, total }) => (
  <div className="progress-bar">
    <div
      className="progress-fill"
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
);

export default ProgressBar;
