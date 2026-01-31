import { useState } from "react";
import axios from "axios";
// ✅ FIXED: Only one import line for router tools
import { useNavigate, Link } from "react-router-dom"; 

// Uses the Cloud URL if available
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); 

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        formData,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user_type", response.data.user_type);
      localStorage.setItem("full_name", response.data.full_name);

      alert("Login Successful! Redirecting...");
      navigate("/dashboard"); 
      
    } catch (err) {
      console.error(err);
      setError("Invalid email or password");
    }
  };

  return (
    <div style={{ maxWidth: "300px", margin: "50px auto", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: "#0056b3" }}>🏥 User Login </h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />

        <button type="submit" style={{ padding: "10px", cursor: "pointer", backgroundColor: "#0056b3", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}>
          Login
        </button>
      </form>

      {/* ✅ FIXED: Link is now nicely placed at the bottom */}
      <div style={{ marginTop: "20px", fontSize: "0.9em" }}>
        <p>Don't have an account?</p>
        <Link to="/register" style={{ color: "#0056b3", fontWeight: "bold", textDecoration: "none" }}>
            👉 Create an Account
        </Link>
      </div>
    </div>
  );
}

export default Login;