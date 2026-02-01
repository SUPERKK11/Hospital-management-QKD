// frontend/src/components/TransferControl.jsx
import React, { useState } from 'react';
import axios from 'axios';

const TransferControl = ({ recordId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [target, setTarget] = useState("City Hospital B");
  const [error, setError] = useState("");

  const handleTransfer = async () => {
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const token = localStorage.getItem('token');
      
      // 1. Call our new Backend Endpoint
      const response = await axios.post('http://localhost:8000/api/transfer/execute', 
        { 
          record_id: recordId, 
          target_hospital_name: target 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. Show the "Secure Payload"
      setResult(response.data);

    } catch (err) {
      console.error(err);
      setError("Transfer Failed. Check console.");
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
          {error && <span className="text-red-500 text-xs">{error}</span>}
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Success Header */}
          <div className="p-2 bg-green-100 text-green-800 rounded mb-3 text-sm border border-green-200">
            ✅ <strong>Secure Link Established!</strong> Data sent to {result.receiver}.
          </div>

          {/* THE HACKER VIEW (Tech Stats) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            
            {/* Box 1: Quantum Key Stats */}
            <div className="bg-gray-900 text-green-400 p-3 rounded shadow-inner">
              <div className="text-gray-500 mb-1 border-b border-gray-700 pb-1">PROTOCOL: {result.qkd_stats.protocol}</div>
              <div className="mb-1">KEY_HASH: {result.qkd_stats.transmission_key_hash}</div>
              <div>BITS_EXCHANGED: {result.qkd_stats.bits_exchanged}</div>
            </div>

            {/* Box 2: The Encrypted Payload */}
            <div className="bg-gray-900 text-yellow-400 p-3 rounded shadow-inner overflow-hidden">
              <div className="text-gray-500 mb-1 border-b border-gray-700 pb-1">📦 ENCRYPTED PACKET (Simulated)</div>
              <div className="break-all opacity-80">
                {result.secure_payload.encrypted_diagnosis.substring(0, 50)}...
              </div>
              <div className="mt-2 text-gray-500 italic">
                (Only receiver with Quantum Key can decrypt)
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