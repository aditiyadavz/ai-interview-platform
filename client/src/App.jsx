import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Roles from "./pages/Roles";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/roles" element={<Roles />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
