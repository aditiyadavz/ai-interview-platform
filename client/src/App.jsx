import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/common/Navbar";
import Home from "./pages/Home";
import Roles from "./pages/Roles";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InterviewSetup from "./pages/InterviewSetup";
import Contact from "./pages/Contact";

function App() {
  return (
    <BrowserRouter>
      {/* Global Navbar */}
      <Navbar />

      {/* Page Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/interview-setup" element={<InterviewSetup />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
