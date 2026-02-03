import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TransferControl = ({ recordId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hospitals, setHospitals] = useState([]); 
  const [target, setTarget] = useState(""); 
  const [error, setError] = useState("");

  // Load Hospitals
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
        console.error("Hospital load error", err);
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
      // Payload matches the BatchTransferRequest model in transfer.py
      const payload = { 
          record_ids: [recordId], 
          target_hospital_name: target 
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/transfer/execute-batch`, 
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // The response is the 'summary' dict: {success: [], skipped: [], failed: []}
      setResult(response.data);
    } catch (err) {
      console.error("Transfer Error:", err);
      setError("Transfer Failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
      <h4 className="font-bold text-indigo-900 mb-2">⚛️ Quantum Secure Transfer</h4>
      
      {!result ? (
        <div className="flex gap-2">
          <select 
            value={target} 
            onChange={(e) => setTarget(e.target.value)}
            className="p-2 border rounded text-sm bg-white"
          >
            {hospitals.map((h, i) => <option key={i} value={h}>{h}</option>)}
          </select>
          
          <button 
            onClick={handleTransfer} 
            disabled={loading || !target}
            className="px-4 py-2 rounded text-white bg-indigo-600 disabled:bg-gray-400"
          >
            {loading ? "Establishing QKD..." : "Send Record"}
          </button>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          {/* We check success/skipped/failed arrays from the backend response */}
          {result?.success?.includes(recordId) && (
            <div className="text-green-700 font-bold">✅ Successfully Transferred!</div>
          )}
          {result?.skipped?.includes(recordId) && (
            <div className="text-amber-700 font-bold">⚠️ Already exists in target inbox.</div>
          )}
          {result?.failed?.some(f => f.id === recordId) && (
            <div className="text-red-700 font-bold">❌ Transfer Failed.</div>
          )}
          <button onClick={() => setResult(null)} className="text-xs text-indigo-600 underline">Back</button>
        </div>
      )}
    </div>
  );
};

export default TransferControl;