import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import DemoBanner from "./components/common/DemoBanner";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Progress from "./pages/Progress";
import Contact from "./pages/Contact";
import Roles from "./pages/Roles";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewRoom from "./pages/InterviewRoom";
import ScoreCard from "./pages/ScoreCard";
import ScoreCardDetail from "./pages/ScoreCardDetail";
import Feedback from "./pages/Feedback";
import InterviewHistory from "./pages/InterviewHistory";
import Profile from "./pages/Profile";
import FriendRoomCreate from "./pages/FriendRoomCreate";
import FriendRoomJoin from "./pages/FriendRoomJoin";
import FriendCallRoom from "./pages/FriendCallRoom";
import Achievements from "./pages/Achievements";          // ← NEW
import ResumeInterviewSetup from "./pages/ResumeInterviewSetup";     // ← NEW
import ResumeInterviewRoom from "./pages/ResumeInterviewRoom";       // ← NEW
import ResumeInterviewResults from "./pages/ResumeInterviewResults"; // ← NEW
import ProtectedRoute from "./components/common/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";

const PublicRoute = ({ children }) => {
  const token  = localStorage.getItem("token");
  const isAuth = localStorage.getItem("isAuthenticated");
  return token && isAuth ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <>
      <Navbar />
      <DemoBanner />
      <Routes>
        {/* Public */}
        <Route path="/"        element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login"   element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup"  element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        {/* Friend Interview — intentionally public (guest, no login) */}
        <Route path="/friend-interview/join/:code" element={<FriendRoomJoin />} />
        <Route path="/friend-interview/room/:code" element={<FriendCallRoom />} />

        {/* Protected */}
        <Route path="/dashboard"               element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/progress"                element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/roles"                   element={<ProtectedRoute><Roles /></ProtectedRoute>} />
        <Route path="/interview-setup/:role"   element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
        <Route path="/interview-room/:role"    element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
        <Route path="/interview-history"       element={<ProtectedRoute><InterviewHistory /></ProtectedRoute>} />
        <Route path="/scorecard/:role"         element={<ProtectedRoute><ScoreCard /></ProtectedRoute>} />
        <Route path="/interview/:id"           element={<ProtectedRoute><ScoreCardDetail /></ProtectedRoute>} />
        <Route path="/feedback/:role"          element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/profile"                 element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/achievements"            element={<ProtectedRoute><Achievements /></ProtectedRoute>} />  {/* ← NEW */}
        <Route path="/resume-interview/setup"   element={<ProtectedRoute><ResumeInterviewSetup /></ProtectedRoute>} />   {/* ← NEW */}
        <Route path="/resume-interview/room"    element={<ProtectedRoute><ResumeInterviewRoom /></ProtectedRoute>} />    {/* ← NEW */}
        <Route path="/resume-interview/results" element={<ProtectedRoute><ResumeInterviewResults /></ProtectedRoute>} /> {/* ← NEW */}
        <Route path="/friend-interview/create" element={<ProtectedRoute><FriendRoomCreate /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;