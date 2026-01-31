import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard"; // Import the new page

function App() {
  return (
    <Router>
      <Routes>
        {/* Home Page is Login */}
        <Route path="/" element={<Login />} />
        
        {/* Dashboard Page */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
