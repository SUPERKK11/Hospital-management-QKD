import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TransferControl = ({ recordId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [target, setTarget] = useState("General Hospital C"); // Default target
  const [error, setError] = useState("");

  const handleTransfer = async () => {
    if (!recordId) return alert("Error: Record ID missing.");
    
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const token = localStorage.getItem('token');
      
      // ✅ Matches your new Backend "TransferRequest" model
      const payload = { 
          record_id: recordId, 
          target_hospital_name: target 
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/transfer/execute`, 
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(response.data);

    } catch (err) {
      console.error("Transfer Error:", err);
      setError("Transfer Failed: " + (err.response?.data?.detail || "Server Error"));
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
          <select 
            value={target} 
            onChange={(e) => setTarget(e.target.value)}
            className="p-2 border rounded text-sm bg-white"
          >
            <option>City Hospital B</option>
            <option>General Hospital C</option>
            <option>Research Institute D</option>
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
          {error && <span className="text-red-500 text-xs block w-full">{error}</span>}
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="p-2 bg-green-100 text-green-800 rounded mb-3 text-sm border border-green-200">
            ✅ <strong>Transfer Complete!</strong> Sent to {result.receiver}.
          </div>

          {/* Technical Stats Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-gray-900 text-green-400 p-3 rounded shadow-inner">
              <div className="text-gray-500 mb-1 border-b border-gray-700">QKD PROTOCOL Stats</div>
              <div>BITS: {result.qkd_stats.bits_exchanged}</div>
              <div className="truncate">HASH: {result.qkd_stats.transmission_key_hash}</div>
            </div>

            <div className="bg-gray-900 text-yellow-400 p-3 rounded shadow-inner">
              <div className="text-gray-500 mb-1 border-b border-gray-700">ENCRYPTED PACKET</div>
              <div className="break-all opacity-80">
                {result.secure_payload.encrypted_diagnosis.substring(0, 40)}...
              </div>
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