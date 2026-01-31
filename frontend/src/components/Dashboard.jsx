import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// 👇 DEFINING THE API URL DYNAMICALLY (Works on Cloud & Localhost)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  
  // 🇮🇳 ABHA STATE VARIABLES
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(0); 
  const [tempOtp, setTempOtp] = useState("");
  const [userType, setUserType] = useState(""); 

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecords = async () => {
      const token = localStorage.getItem("token");
      
      const rawType = localStorage.getItem("user_type");
      const type = rawType ? rawType.toLowerCase() : ""; 
      setUserType(type);

      if (!token) {
        navigate("/");
        return;
      }

      try {
        // 👇 UPDATED: Uses API_BASE_URL
        const response = await axios.get(`${API_BASE_URL}/api/records/my-records`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecords(response.data);
      } catch (err) {
        console.error(err);
        setError("Session expired or invalid permissions.");
      }
    };

    fetchRecords();
  }, [navigate]);

  // --- 🇮🇳 ABHA FUNCTIONS ---
  const requestOtp = async () => {
    try {
      const token = localStorage.getItem("token");
      // 👇 UPDATED: Uses API_BASE_URL
      const res = await axios.post(
        `${API_BASE_URL}/api/abha/request-otp?aadhaar=${aadhaar}`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTempOtp(res.data.mock_otp);
      setStep(2); 
      alert(`Simulation: Your OTP is ${res.data.mock_otp}`);
    } catch (err) {
      alert("Invalid Aadhaar Number (Must be 12 digits)");
    }
  };

  const verifyOtp = async () => {
    try {
      const token = localStorage.getItem("token");
      // 👇 UPDATED: Uses API_BASE_URL
      const res = await axios.post(
        `${API_BASE_URL}/api/abha/verify-otp?aadhaar=${aadhaar}&otp=${otp}`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Success! ABHA ID Created: ${res.data.abha_address}`);
      setStep(3); 
    } catch (err) {
      alert("Incorrect OTP");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // --- STYLES ---
  const cardStyle = {
    backgroundColor: "white", padding: "25px", borderRadius: "10px", 
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginBottom: "20px"
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f0f8ff", padding: "20px" }}>
      {/* Header Bar */}
      <div style={{ 
        maxWidth: "900px", margin: "0 auto 30px auto", display: "flex", justifyContent: "space-between", 
        alignItems: "center", backgroundColor: "white", padding: "15px 30px", 
        borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" 
      }}>
        <h2 style={{ margin: 0, color: "#0056b3" }}>🏥 Medical Dashboard</h2>
        
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <span style={{ fontSize: "0.8em", color: "#666", border: "1px solid #ccc", padding: "5px 10px", borderRadius: "20px" }}>
                Role: <strong>{userType || "undefined"}</strong>
            </span>
            <button onClick={handleLogout} style={{ backgroundColor: "#dc3545", color: "white", padding: "8px 15px", border: "none", borderRadius: "5px", cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        {/* 🇮🇳 ABHA INTEGRATION SECTION */}
        {userType && userType.includes("patient") && step !== 3 && (
            <div style={{ ...cardStyle, borderLeft: "5px solid #ff9900" }}>
                <h3 style={{ marginTop: 0 }}>🇮🇳 Link ABHA ID (Ayushman Bharat)</h3>
                
                {step === 0 && (
                    <button 
                        onClick={() => setStep(1)}
                        style={{ backgroundColor: "#ff9900", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                    >
                        Create ABHA ID
                    </button>
                )}

                {step === 1 && (
                    <div style={{ display: "flex", gap: "10px" }}>
                        <input 
                            type="text" 
                            placeholder="Enter 12-digit Aadhaar" 
                            value={aadhaar}
                            onChange={(e) => setAadhaar(e.target.value)}
                            style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", flex: 1 }}
                        />
                        <button onClick={requestOtp} style={{ backgroundColor: "#0056b3", color: "white", padding: "8px 15px", border: "none", borderRadius: "5px", cursor: "pointer" }}>Send OTP</button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                        <p style={{ margin: "0 0 5px 0", color: "green" }}>✅ OTP Sent: <strong>{tempOtp}</strong></p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <input 
                                type="text" 
                                placeholder="Enter OTP" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", flex: 1 }}
                            />
                            <button onClick={verifyOtp} style={{ backgroundColor: "#28a745", color: "white", padding: "8px 15px", border: "none", borderRadius: "5px", cursor: "pointer" }}>Verify & Link</button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {step === 3 && (
            <div style={{ ...cardStyle, borderLeft: "5px solid #28a745", backgroundColor: "#e8f5e9" }}>
                <h3 style={{ margin: 0, color: "#2e7d32" }}>✅ ABHA ID Linked Successfully</h3>
                <p style={{ margin: "5px 0 0 0" }}>Your health records are now synced with the National Health Authority network.</p>
            </div>
        )}

        {/* MEDICAL RECORDS SECTION */}
        {records.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "50px", color: "#666" }}>
            <h3>No medical records found.</h3>
            <p>You seem to be in perfect health! (Or the doctor hasn't seen you yet).</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {records.map((record) => (
              <div key={record._id} style={{ ...cardStyle, borderLeft: "5px solid #0056b3" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0, color: "#333" }}>{record.diagnosis}</h3>
                  <small style={{ color: "#888" }}>{new Date(record.created_at).toLocaleDateString()}</small>
                </div>
                
                <p><strong>💊 Prescription:</strong> {record.prescription}</p>
                {record.notes && <p><strong>📝 Doctor's Notes:</strong> {record.notes}</p>}
                
                <div style={{ marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "10px", fontSize: "0.9em", color: "#555", display: "flex", justifyContent: "space-between" }}>
                  <span>Dr. {record.doctor_name}</span>
                  {record.quantum_key && (
                      <span style={{ backgroundColor: "#e3f2fd", color: "#0d47a1", padding: "2px 8px", borderRadius: "10px", fontSize: "0.8em" }}>
                        ⚛️ Quantum Secured
                      </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;