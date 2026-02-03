import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, CheckCircle, ArrowDownCircle, Loader, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const Inbox = () => {
  const [incomingRecords, setIncomingRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  // Track which specific record is being accepted to show a spinner on that button
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchInbox();
    // Refresh inbox every 15 seconds to catch new transfers
    const interval = setInterval(fetchInbox, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchInbox = async () => {
    // Only set global loading on initial fetch, not background refreshes
    if (incomingRecords.length === 0) setLoading(true);
    try {
      const token = localStorage.getItem('token');
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

  const handleAccept = async (id) => {
    setProcessingId(id);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Call the backend to move data from Inbox -> Records
      await axios.post(`${API_BASE_URL}/api/transfer/accept`, 
        { inbox_id: id }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. Remove from UI immediately (Optimistic UI update)
      setIncomingRecords(prev => prev.filter(r => (r._id || r.id) !== id));
      
      // 3. Success Message
      alert("✅ Patient Record Accepted! It is now in your main history.");
      
      // 4. Force refresh to update the main dashboard list
      window.location.reload(); 

    } catch (err) {
      alert("❌ Failed to accept record. Please try again.");
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
        <h3 className="text-indigo-900 font-bold flex items-center gap-2">
          <ArrowDownCircle size={20} className="text-indigo-600"/> 
          Incoming Transfers
          {incomingRecords.length > 0 && (
            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              {incomingRecords.length} New
            </span>
          )}
        </h3>
        <button 
          onClick={fetchInbox}
          className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-100 transition shadow-sm"
        >
          Refresh
        </button>
      </div>

      {/* List Content */}
      <div className="divide-y divide-gray-50 overflow-y-auto max-h-[400px]">
        {incomingRecords.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
            <CheckCircle size={32} className="mb-2 opacity-20" />
            <p className="text-sm italic">Inbox is empty.</p>
            <p className="text-[10px]">Transfers from other hospitals will appear here.</p>
          </div>
        ) : (
          incomingRecords.map((rec) => {
            const recId = rec._id || rec.id;
            return (
              <div key={recId} className="p-4 hover:bg-gray-50 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">
                        SECURE QKD
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(rec.created_at || rec.received_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm">{rec.diagnosis || "Encrypted Record"}</h4>
                  </div>
                  
                  {/* 👇 THIS IS THE BUTTON YOU WERE MISSING 👇 */}
                  <button 
                    onClick={() => handleAccept(recId)}
                    disabled={processingId === recId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded shadow-sm flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-wait"
                  >
                    {processingId === recId ? (
                      <>
                        <Loader size={12} className="animate-spin"/> Processing...
                      </>
                    ) : (
                      <>
                        <Download size={14} /> Accept Record
                      </>
                    )}
                  </button>
                  {/* 👆 --------------------------------- 👆 */}
                </div>

                <div className="bg-gray-50 p-2.5 rounded border border-gray-100 mb-2">
                  <p className="text-xs text-gray-600 line-clamp-2 italic">
                    {rec.prescription || "No preview available..."}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    From: <span className="font-bold text-indigo-600">{rec.sender || rec.hospital || "Unknown Network"}</span>
                  </span>
                  <span className="text-gray-400 flex items-center gap-1">
                     ID: {rec.patient_email || "Hidden"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer Status */}
      <div className="bg-gray-50 p-2 text-center border-t border-gray-100">
        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold flex justify-center items-center gap-1">
          <AlertCircle size={10} /> Quantum-Safe Tunnel Active
        </p>
      </div>
    </div>
  );
};

export default Inbox;