import React, { useState } from 'react';
import axios from 'axios';

// Get API URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TransferControl = ({ recordId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [target, setTarget] = useState("hospitalB"); // Default to ID, not name
  const [error, setError] = useState("");

  const handleTransfer = async () => {
    // 1. Safety Check: Did the parent pass the ID?
    if (!recordId) {
        alert("❌ Error: Cannot transfer. Record ID is missing.");
        console.error("TransferControl Error: recordId prop is undefined.");
        return;
    }

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const token = localStorage.getItem('token');
      
      // 2. Prepare Payload (MUST match Backend Pydantic Model)
      const payload = { 
          record_id: recordId, 
          recipient_hospital_id: target // <--- FIXED: Matches backend
      };

      console.log("🚀 Sending Transfer Request:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/api/transfer/execute`, 
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 3. Show Success
      setResult(response.data);

    } catch (err) {
      console.error("Transfer Error:", err);
      // specific error message from backend if available
      const serverMsg = err.response?.data?.detail?.[0]?.msg || err.message;
      setError(`Transfer Failed: ${serverMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
      <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
        ⚛️ Quantum Secure Transfer
      </h4>
      
      {!result ? (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600">Send to:</span>
          <select 
            value={target} 
            onChange={(e) => setTarget(e.target.value)}
            className="p-2 border rounded text-sm bg-white"
          >
            {/* Values must match valid Hospital IDs in your logic */}
            <option value="hospitalA">Hospital A (City)</option>
            <option value="hospitalB">Hospital B (West)</option>
            <option value="researchC">Research Lab C</option>
          </select>
          
          <button 
            onClick={handleTransfer} 
            disabled={loading}
            className={`px-4 py-2 rounded text-white text-sm font-semibold transition ${
              loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Establishing QKD Link..." : "🚀 Initiate Transfer"}
          </button>
          {error && <span className="text-red-500 text-xs block w-full mt-2">{error}</span>}
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="p-2 bg-green-100 text-green-800 rounded mb-3 text-sm border border-green-200">
            ✅ <strong>Secure Link Established!</strong>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs font-mono">
            <div className="bg-gray-900 text-green-400 p-3 rounded shadow-inner">
              <div className="mb-1">KEY_HASH: {result.qkd_key || "HIDDEN"}</div>
              <div>STATUS: SECURE_TRANSMISSION</div>
            </div>
          </div>
          
          <button 
            onClick={() => setResult(null)} 
            className="text-xs text-indigo-600 underline mt-3 hover:text-indigo-800"
          >
            Start New Transfer
          </button>
        </div>
      )}
    </div>
  );
};

export default TransferControl;