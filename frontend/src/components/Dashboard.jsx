import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Uses the Cloud URL if available
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [userType, setUserType] = useState("");
  const [fullName, setFullName] = useState("");
  const [records, setRecords] = useState([]);
  
  // Doctor Form State
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); // Renamed from 'details' to 'prescription'

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const type = localStorage.getItem("user_type");
    const name = localStorage.getItem("full_name");

    if (!token) {
      navigate("/"); 
    } else {
      setUserType(type);
      setFullName(name);
      
      if (type === "patient") {
        fetchRecords(token);
      }
    }
  }, [navigate]);

  const fetchRecords = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/records/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(response.data);
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      // 👇 FIX: Sending the correct field names based on your backend schema
      await axios.post(
        `${API_BASE_URL}/api/records/create`,
        {
          patient_email: patientEmail,
          diagnosis: diagnosis,
          prescription: prescription, // Correct Field Name
          notes: "Prescribed via Web Dashboard" // Optional extra field
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Record created successfully!");
      setPatientEmail("");
      setDiagnosis("");
      setPrescription(""); // Clear the form
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
          alert(`Server Error: ${JSON.stringify(err.response.data.detail)}`);
      } else {
          alert("Network Error: Could not reach the server.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h2 style={{ color: "#0056b3" }}>🏥 Hospital Dashboard</h2>
        <button onClick={handleLogout} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
        <strong>Welcome, {fullName || "User"}!</strong> <br/>
        <span style={{ fontSize: "0.9em", color: "#666" }}>Role: {userType === "doctor" ? "👨‍⚕️ Doctor" : "🤒 Patient"}</span>
      </div>

      {/* --- DOCTOR VIEW --- */}
      {userType === "doctor" && (
        <div style={{ border: "2px solid #28a745", padding: "20px", borderRadius: "10px", backgroundColor: "#e9f7ef" }}>
          <h3 style={{ color: "#28a745", marginTop: 0 }}>📝 Create New Medical Record</h3>
          <form onSubmit={handleCreateRecord} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <input 
              type="email" 
              placeholder="Patient Email" 
              value={patientEmail} 
              onChange={(e) => setPatientEmail(e.target.value)} 
              required 
              style={inputStyle}
            />
            <input 
              type="text" 
              placeholder="Diagnosis (e.g. Fever)" 
              value={diagnosis} 
              onChange={(e) => setDiagnosis(e.target.value)} 
              required 
              style={inputStyle}
            />
            <textarea 
              placeholder="Prescription / Treatment" 
              value={prescription} 
              onChange={(e) => setPrescription(e.target.value)} 
              required 
              style={{ ...inputStyle, height: "80px" }}
            />
            <button type="submit" style={{ padding: "10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
              Save Record
            </button>
          </form>
        </div>
      )}

      {/* --- PATIENT VIEW --- */}
      {userType === "patient" && (
        <div>
          <h3>📂 My Medical History</h3>
          {records.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>No medical records found. You seem to be in perfect health! (Or the doctor hasn't seen you yet).</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {records.map((rec, index) => (
                <div key={index} style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h4 style={{ margin: "0 0 5px 0", color: "#0056b3" }}>{rec.diagnosis}</h4>
                  {/* 👇 FIX: Displaying 'prescription' instead of 'details' */}
                  <p style={{ margin: "5px 0" }}><strong>Rx:</strong> {rec.prescription}</p> 
                  <p style={{ margin: "0", fontSize: "0.85em", color: "#666" }}>
                    Created by: {rec.doctor_name || "Doctor"} on {new Date(rec.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc" };

export default Dashboard;