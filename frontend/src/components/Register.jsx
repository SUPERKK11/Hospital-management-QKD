import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

// Uses the Cloud URL if available
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Register() {
  const [formData, setFormData] = useState({
    username: "", // This will be the email
    password: "",
    full_name: "",
    user_type: "patient", // Default to patient
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 👇 FIX 1: Changed "/register" to "/signup" (This is the most common fix for 404)
      await axios.post(`${API_BASE_URL}/api/auth/signup`, formData);
      
      alert("Registration Successful! Please Login.");
      navigate("/"); // Redirect to Login page
    } catch (err) {
      console.error(err);
      // 👇 FIX 2: Show the REAL error message from the backend
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Error: ${JSON.stringify(err.response.data.detail)}`);
      } else {
        setError("Registration failed. Please check your connection.");
      }
    }
  };

  return (
    <div style={{ maxWidth: "350px", margin: "50px auto", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: "#0056b3" }}>📝 Create Account</h2>
      {error && <p style={{ color: "red", backgroundColor: "#ffe6e6", padding: "5px", borderRadius: "5px" }}>{error}</p>}

      <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        
        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />

        <input
          type="email"
          name="username"
          placeholder="Email Address"
          value={formData.username}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        />

        <select 
            name="user_type" 
            value={formData.user_type} 
            onChange={handleChange}
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
        >
            <option value="patient">I am a Patient</option>
            <option value="doctor">I am a Doctor</option>
        </select>

        <button type="submit" style={{ padding: "10px", cursor: "pointer", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}>
          Sign Up
        </button>
      </form>

      <p style={{ marginTop: "20px" }}>
        Already have an account? <Link to="/" style={{ color: "#0056b3" }}>Login here</Link>
      </p>
    </div>
  );
}

export default Register;