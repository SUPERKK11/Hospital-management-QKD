import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecords = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response = await axios.get("http://127.0.0.1:8000/api/records/my-records", {
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f0f8ff", padding: "20px" }}>
      {/* Header Bar */}
      <div style={{ 
        maxWidth: "900px", margin: "0 auto", display: "flex", justifyContent: "space-between", 
        alignItems: "center", backgroundColor: "white", padding: "15px 30px", 
        borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" 
      }}>
        <h2 style={{ margin: 0, color: "#0056b3" }}>🏥 Medical Dashboard</h2>
        <button onClick={handleLogout} style={{ backgroundColor: "#dc3545" }}>Logout</button>
      </div>

      <div style={{ maxWidth: "900px", margin: "30px auto" }}>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        {records.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "50px", color: "#666" }}>
            <h3>No medical records found.</h3>
            <p>You seem to be in perfect health! (Or the doctor hasn't seen you yet).</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {records.map((record) => (
              <div key={record._id} style={{ 
                backgroundColor: "white", padding: "25px", borderRadius: "10px", 
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)", borderLeft: "5px solid #0056b3" 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0, color: "#333" }}>{record.diagnosis}</h3>
                  <small style={{ color: "#888" }}>{new Date(record.created_at).toLocaleDateString()}</small>
                </div>
                
                <p><strong>💊 Prescription:</strong> {record.prescription}</p>
                <p><strong>📝 Doctor's Notes:</strong> {record.notes}</p>
                
                <div style={{ marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "10px", fontSize: "0.9em", color: "#555" }}>
                  Treating Physician: <strong>{record.doctor_name}</strong>
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