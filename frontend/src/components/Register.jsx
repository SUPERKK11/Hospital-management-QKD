import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

// Uses the Cloud URL if available
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Register() {
  const [formData, setFormData] = useState({
    email: "", 
    password: "",
    full_name: "",
    phone: "",
    abha_id: "",
    age: "",
    address: "",
    user_type: "patient",
    specialization: "", 
    license_number: "" 
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
      // 1. Select the correct URL
      const endpoint = formData.user_type === "doctor" 
        ? "/api/auth/register/doctor" 
        : "/api/auth/register/patient";

      // 2. Format the data correctly
      const payload = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        user_type: formData.user_type, // 👈 THIS WAS MISSING! ADDED NOW.
      };

      // Add specific fields based on user type
      if (formData.user_type === "patient") {
        payload.age = parseInt(formData.age); // Ensure age is a number
        payload.address = formData.address;
        payload.abha_id = formData.abha_id;
      } else {
        // Assume Doctor needs these
        payload.specialization = formData.specialization || "General";
        payload.license_number = formData.license_number || "NA";
      }

      console.log("Sending Payload:", payload); 

      await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      
      alert(`Registration Successful as a ${formData.user_type}! Please Login.`);
      navigate("/"); 

    } catch (err) {
      console.error("Full Error:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Missing Data: ${JSON.stringify(err.response.data.detail)}`);
      } else {
        setError("Registration failed. Please check your connection.");
      }
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: "#0056b3" }}>📝 Create Account</h2>
      {error && <p style={{ color: "red", fontSize: "0.8em", backgroundColor: "#ffe6e6", padding: "5px" }}>{error}</p>}

      <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        
        {/* --- COMMON FIELDS --- */}
        <input type="text" name="full_name" placeholder="Full Name" value={formData.full_name} onChange={handleChange} required style={inputStyle} />
        <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required style={inputStyle} />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required style={inputStyle} />
        <input type="text" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required style={inputStyle} />

        <select name="user_type" value={formData.user_type} onChange={handleChange} style={inputStyle}>
            <option value="patient">I am a Patient</option>
            <option value="doctor">I am a Doctor</option>
        </select>

        {/* --- PATIENT SPECIFIC FIELDS --- */}
        {formData.user_type === "patient" && (
            <>
                <div style={{display: 'flex', gap: '10px'}}>
                    <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleChange} required style={{...inputStyle, flex: 1}} />
                    <input type="text" name="abha_id" placeholder="ABHA ID (e.g. 12-34-56)" value={formData.abha_id} onChange={handleChange} required style={{...inputStyle, flex: 2}} />
                </div>
                <textarea name="address" placeholder="Home Address" value={formData.address} onChange={handleChange} required style={{...inputStyle, height: "60px"}} />
            </>
        )}

        {/* --- DOCTOR SPECIFIC FIELDS --- */}
        {formData.user_type === "doctor" && (
            <>
                <input type="text" name="specialization" placeholder="Specialization (e.g. Cardiology)" value={formData.specialization} onChange={handleChange} style={inputStyle} />
                <input type="text" name="license_number" placeholder="License Number" value={formData.license_number} onChange={handleChange} style={inputStyle} />
            </>
        )}

        <button type="submit" style={{ padding: "12px", cursor: "pointer", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold", marginTop: "10px" }}>
          Sign Up
        </button>
      </form>

      <p style={{ marginTop: "20px" }}>
        Already have an account? <Link to="/" style={{ color: "#0056b3" }}>Login here</Link>
      </p>
    </div>
  );
}

const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc" };

export default Register;