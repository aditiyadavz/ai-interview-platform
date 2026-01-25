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

import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/roles" element={<Roles />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/interview-setup/:role" element={
          <ProtectedRoute>
            <InterviewSetup />
          </ProtectedRoute>
        } />

        <Route path="/interview-room/:role" element={
          <ProtectedRoute>
            <InterviewRoom />
          </ProtectedRoute>
        } />

        <Route path="/scorecard" element={
          <ProtectedRoute>
            <ScoreCard />
          </ProtectedRoute>
        } />

        <Route path="/feedback" element={
          <ProtectedRoute>
            <Feedback />
          </ProtectedRoute>
        } />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
