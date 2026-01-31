import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard"; // Import the new page
import Register from "./components/Register"; // 👈 IMPORT THIS

function App() {
  return (
    <Router>
      <Routes>
        {/* Home Page is Login */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} /> {/* 👈 ADD THIS LINE */}
        {/* Dashboard Page */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
