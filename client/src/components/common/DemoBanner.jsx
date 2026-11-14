import { Link, useLocation } from "react-router-dom";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

// Shown while logged in to the shared demo account, so visitors know the
// history they see is sample data and some actions are disabled.
// useLocation() re-renders it on navigation (e.g. right after demo login).
const DemoBanner = () => {
  useLocation();
  const user = readUser();
  if (!user?.isDemo || !localStorage.getItem("token")) return null;

  return (
    <div className="demo-banner" role="status">
      👀 You're exploring the <strong>demo account</strong> — history shown is sample data, and
      profile/password changes are disabled. <Link to="/signup">Create a free account</Link> to save your own progress.
    </div>
  );
};

export default DemoBanner;
