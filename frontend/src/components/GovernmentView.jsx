import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function GovernmentView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/transfer/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
      setError("Access Denied: You do not have security clearance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ backgroundColor: "#2c3e50", color: "white", padding: "15px", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🛡️ National Health Security Audit</h2>
        <button onClick={fetchAuditLogs} style={{ backgroundColor: "#e74c3c", color: "white", border: "none", padding: "5px 15px", borderRadius: "4px", cursor: "pointer" }}>
          Refresh Live Logs
        </button>
      </div>

      <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "0 0 8px 8px", backgroundColor: "#f8f9fa" }}>
        {loading ? (
          <p>Scanning network...</p>
        ) : error ? (
          <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>
        ) : logs.length === 0 ? (
          <p>No QKD transfers detected yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#ddd", textAlign: "left" }}>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>From Hospital</th>
                <th style={thStyle}>To Hospital</th>
                <th style={thStyle}>Record ID</th>
                <th style={thStyle}>QKD Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={tdStyle}>{log.sender_hospital}</td>
                  <td style={tdStyle}>➡️ {log.receiver_hospital}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", color: "#666" }}>{log.record_id.slice(-6)}...</td>
                  <td style={{ ...tdStyle, color: "#27ae60", fontWeight: "bold" }}>
                    🔒 {log.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: "12px", borderBottom: "2px solid #ccc" };
const tdStyle = { padding: "10px" };

export default GovernmentView;