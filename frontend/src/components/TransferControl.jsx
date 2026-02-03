import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TransferControl = ({ recordId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hospitals, setHospitals] = useState([]); 
  const [target, setTarget] = useState(""); 
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/doctors/target-hospitals`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHospitals(res.data || []);
        if (res.data?.length > 0) setTarget(res.data[0]);
      } catch (err) {
        console.error("Failed to load hospitals", err);
      }
    };
    fetchHospitals();
  }, []);

  const handleTransfer = async () => {
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const token = localStorage.getItem('token');
      // Matches the BatchTransferRequest model in transfer.py
      const payload = { 
          record_ids: [recordId], 
          target_hospital_name: target 
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/transfer/execute-batch`, 
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(response.data);
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(Array.isArray(msg) ? msg[0]?.msg : "Transfer Error");
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
            className="p-2 border rounded text-sm bg-white min-w-[150px]"
          >
            {hospitals.map((hosp, index) => (
              <option key={index} value={hosp}>To: {hosp}</option>
            ))}
          </select>
          
          <button 
            onClick={handleTransfer} 
            disabled={loading || !target}
            className="px-4 py-2 rounded text-white text-sm font-semibold bg-indigo-600 disabled:bg-gray-400"
          >
            {loading ? "Establishing QKD..." : "🚀 Initiate Transfer"}
          </button>
          {error && <span className="text-red-500 text-[10px] block w-full mt-1 font-bold">{error}</span>}
        </div>
      ) : (
        <div className="space-y-3">
          {/* UPDATED UI: Matches transfer.py response keys: success, skipped, failed */}
          {result.success?.length > 0 && (
            <div className="p-2 bg-green-100 text-green-800 rounded text-sm border border-green-200">
              ✅ <strong>Success!</strong> Record transferred to {target}.
            </div>
          )}
          
          {result.skipped?.length > 0 && (
            <div className="p-2 bg-amber-100 text-amber-800 rounded text-sm border border-amber-200">
              ⚠️ <strong>Skipped:</strong> This version already exists in target inbox.
            </div>
          )}

          {result.failed?.length > 0 && (
            <div className="p-2 bg-red-100 text-red-800 rounded text-sm border border-red-200">
              ❌ <strong>Failed:</strong> {result.failed[0]?.reason || "Unknown error"}
            </div>
          )}
          
          <button onClick={() => setResult(null)} className="text-[10px] text-indigo-600 underline">
            Start New Transfer
          </button>
        </div>
      )}
    </div>
  );
};

export default TransferControl;