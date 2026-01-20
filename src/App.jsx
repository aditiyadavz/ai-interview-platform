import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Roles from "./pages/Roles";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InterviewSetup from "./pages/InterviewSetup";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/interview-setup" element={<InterviewSetup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
