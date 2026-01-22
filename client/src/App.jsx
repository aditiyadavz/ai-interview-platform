import { Routes, Route } from "react-router-dom";

import Navbar from "./components/common/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
<<<<<<< HEAD
import Dashboard from "./pages/Dashboard";import Contact from "./pages/Contact";
=======
import Dashboard from "./pages/Dashboard";
import InterviewSetup from "./pages/InterviewSetup";
import Contact from "./pages/Contact";
>>>>>>> 06af36424995dedac462ad60a04f8fdbe706a0c8

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

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
<<<<<<< HEAD
=======

        <Route
          path="/interview-setup"
          element={
            <ProtectedRoute>
              <InterviewSetup />
            </ProtectedRoute>
          }
        />
>>>>>>> 06af36424995dedac462ad60a04f8fdbe706a0c8
      </Routes>
    </>
  );
}

export default App;
