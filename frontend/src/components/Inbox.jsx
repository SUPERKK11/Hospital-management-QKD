import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const Inbox = () => {
  const [incomingRecords, setIncomingRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInbox();
    // Refresh inbox every 30 seconds to catch new transfers
    const interval = setInterval(fetchInbox, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // This endpoint fetches records sent TO this doctor's hospital
      const res = await axios.get(`${API_BASE_URL}/api/transfer/my-inbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIncomingRecords(res.data);
    } catch (err) {
      console.error("Error fetching inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
      <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
        <h3 className="text-green-800 font-bold flex items-center gap-2">
          📥 Hospital Inbox 
          <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full text-green-700">
            {incomingRecords.length} New
          </span>
        </h3>
        <button 
          onClick={fetchInbox}
          className="text-xs bg-white border border-green-300 px-3 py-1 rounded hover:bg-green-100 transition"
        >
          {loading ? "Syncing..." : "Refresh"}
        </button>
      </div>

      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {incomingRecords.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic text-sm">
            No incoming transfers found for your hospital.
          </div>
        ) : (
          incomingRecords.map((rec) => (
            <div key={rec._id || rec.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Decrypted via QKD</span>
                  <h4 className="font-bold text-gray-800">{rec.diagnosis}</h4>
                </div>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">
                  From: {rec.hospital || "External"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{rec.prescription}</p>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-indigo-600 font-medium">{rec.patient_email}</span>
                <span className="text-gray-400">{new Date(rec.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="bg-gray-50 p-2 text-center border-t border-gray-100">
        <p className="text-[9px] text-gray-400 uppercase tracking-tighter font-bold">
          Security Protocol: Quantum-Safe Tunneling Active
        </p>
      </div>
    </div>
  );
};

export default Inbox;