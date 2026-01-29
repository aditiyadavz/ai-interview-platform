import { Routes, Route } from "react-router-dom";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Contact from "./pages/Contact";
import Roles from "./pages/Roles";
import InterviewSetup from "./pages/InterviewSetup";
import InterviewRoom from "./pages/InterviewRoom";
import ScoreCard from "./pages/ScoreCard";
import Feedback from "./pages/Feedback";
import InterviewHistory from "./pages/InterviewHistory";
import Profile from "./pages/Profile"; // ✅ added Profile page
import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/contact" element={<Contact />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <Roles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview-setup/:role"
          element={
            <ProtectedRoute>
              <InterviewSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview-room/:role"
          element={
            <ProtectedRoute>
              <InterviewRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview-history"
          element={
            <ProtectedRoute>
              <InterviewHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scorecard/:role"
          element={
            <ProtectedRoute>
              <ScoreCard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback/:role"
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />
        {/* ✅ Profile Page */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
