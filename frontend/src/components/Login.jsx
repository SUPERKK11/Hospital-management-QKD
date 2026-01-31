import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// 👇 DEFINING THE API URL DYNAMICALLY
// If we are on Netlify, use the cloud URL. If on laptop, use localhost.
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

      // 👇 UPDATED: Uses API_BASE_URL instead of hardcoded localhost
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        formData,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      // 1. Save Token
      localStorage.setItem("token", response.data.access_token);
      
      // 2. Save User Type (Vital for ABHA box to show)
      localStorage.setItem("user_type", response.data.user_type);
      
      // 3. Save Name (Optional, but nice for UI)
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
      <h2 style={{ color: "#0056b3" }}>🏥 Hospital Login</h2>
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
    </div>
  );
}

export default Login;