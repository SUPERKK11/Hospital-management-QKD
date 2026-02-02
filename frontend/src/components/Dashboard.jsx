import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TransferControl from '../components/TransferControl';
import GovernmentView from '../components/GovernmentView'; // 👈 IMPORT NEW COMPONENT

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [userRole, setUserRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [records, setRecords] = useState([]);
  
  // Doctor Form State
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 

  // AI State
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  // Toggle for Doctor's Hospital selection (if needed) or Department
  const [department, setDepartment] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    // 👇 FIX: Use 'role' instead of 'user_type' to match backend
    const role = localStorage.getItem("role"); 
    const name = localStorage.getItem("full_name");

    if (!token) {
      navigate("/"); 
    } else {
      setUserRole(role);
      setFullName(name);
      
      // Only fetch medical records if NOT government
      if (role !== "government") {
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

  // 🤖 AI Prediction Logic
  const handleAiPrediction = async () => {
    if (!diagnosis) return alert("Please enter symptoms first!");
    setLoadingAi(true);

    try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
            `${API_BASE_URL}/api/predict-department`,
            { diagnosis_text: diagnosis },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Auto-fill and show suggestion
        setDepartment(res.data.recommended_department);
        setAiSuggestion(`💡 AI Suggests: ${res.data.recommended_department} (${res.data.confidence}%)`);
    } catch (err) {
        console.error(err);
        alert("AI Service Unavailable.");
    } finally {
        setLoadingAi(false);
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `${API_BASE_URL}/api/records/create`,
        {
          patient_email: patientEmail,
          diagnosis: diagnosis,
          prescription: prescription, 
          notes: "Prescribed via Web Dashboard"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Record created successfully!");
      setPatientEmail("");
      setDiagnosis("");
      setPrescription(""); 
      setAiSuggestion(""); 
      fetchRecords(token);

    } catch (err) {
      console.error(err);
      alert("Error creating record.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // ---------------------------------------------------------
  // 🛡️ GOVERNMENT VIEW INTERCEPTOR
  // ---------------------------------------------------------
  if (userRole === "government") {
      return (
          <div style={{ fontFamily: "Arial, sans-serif" }}>
              <div style={{ padding: "10px 20px", borderBottom: "1px solid #ccc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>🏛️ Ministry of Health - Oversight Portal</h3>
                  <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
              </div>
              <GovernmentView />
          </div>
      );
  }

  // ---------------------------------------------------------
  // STANDARD VIEW (Doctor & Patient)
  // ---------------------------------------------------------
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h2 style={{ color: "#0056b3" }}>🏥 Hospital Dashboard</h2>
        <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
      </div>

      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px" }}>
        <strong>Welcome, {fullName || "User"}!</strong> <br/>
        <span style={{ fontSize: "0.9em", color: "#666" }}>
            Role: {userRole === "doctor" ? "👨‍⚕️ Doctor" : "🤒 Patient"}
        </span>
      </div>

      {/* --- DOCTOR: CREATE RECORD --- */}
      {userRole === "doctor" && (
        <div style={{ border: "2px solid #28a745", padding: "20px", borderRadius: "10px", backgroundColor: "#e9f7ef", marginBottom: "30px" }}>
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
            
            {/* Diagnosis + AI Section */}
            <div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input 
                      type="text" 
                      placeholder="Diagnosis (e.g. Sharp chest pain)" 
                      value={diagnosis} 
                      onChange={(e) => setDiagnosis(e.target.value)} 
                      required 
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button 
                        type="button" 
                        onClick={handleAiPrediction} 
                        disabled={loadingAi}
                        style={{ ...btnStyle, backgroundColor: "#17a2b8" }}
                    >
                        {loadingAi ? "Thinking..." : "🤖 Ask AI"}
                    </button>
                </div>
                {aiSuggestion && (
                    <div style={{ marginTop: "5px", color: "#28a745", fontWeight: "bold", fontSize: "0.9em" }}>
                        {aiSuggestion}
                    </div>
                )}
            </div>

            {/* Auto-filled Department Field */}
            <input 
              type="text" 
              placeholder="Department (Auto-filled by AI)" 
              value={department} 
              readOnly
              style={{ ...inputStyle, backgroundColor: "#e9ecef" }}
            />

            <textarea 
              placeholder="Prescription / Treatment" 
              value={prescription} 
              onChange={(e) => setPrescription(e.target.value)} 
              required 
              style={{ ...inputStyle, height: "80px" }}
            />
            
            <button type="submit" style={{ ...btnStyle, backgroundColor: "#28a745" }}>
              Save Record
            </button>
          </form>
        </div>
      )}

      {/* --- RECORD LIST --- */}
      <div>
        <h3 style={{ borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
            {userRole === "doctor" ? "📂 Records Created by You" : "📂 My Medical History"}
        </h3>

        {records.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No records found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {records.map((rec) => (
              <div key={rec.id} style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "8px", backgroundColor: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <h4 style={{ margin: "0 0 5px 0", color: "#0056b3" }}>{rec.diagnosis}</h4>
                    <span style={{ fontSize: "0.8em", background: "#d1ecf1", padding: "2px 8px", borderRadius: "10px", color: "#0c5460" }}>
                        {rec.hospital || "Secured"}
                    </span>
                </div>
                <p style={{ margin: "5px 0" }}><strong>Rx:</strong> {rec.prescription}</p> 
                <p style={{ margin: "0 0 10px 0", fontSize: "0.85em", color: "#666" }}>
                  Patient: {rec.patient_email} | Date: {new Date(rec.created_at).toLocaleDateString()}
                </p>

                {/* 👇 FIX: Pass 'id' not '_id' */}
                {userRole === "doctor" && (
                    <>
                        <hr style={{border: "0", borderTop: "1px solid #eee", margin: "10px 0"}}/>
                        <TransferControl recordId={rec.id} />
                    </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// Simple Styles
const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc" };
const btnStyle = { padding: "10px 15px", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const logoutBtnStyle = { padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" };

export default Dashboard;