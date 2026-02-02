import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const BulkPatientList = () => {
  const [patients, setPatients] = useState([]);
  const [hospitals, setHospitals] = useState([]); 
  const [targetHospital, setTargetHospital] = useState("");
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]); 
  
  // Status State
  const [loading, setLoading] = useState(false);
  const [transferResult, setTransferResult] = useState(null);

  // --- 1. INITIAL DATA FETCH ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // A. Get My Patients
      const patRes = await axios.get(`${API_BASE_URL}/api/records/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(patRes.data);

      // B. Get Target Hospitals (Logic: Exclude myself)
      const hospRes = await axios.get(`${API_BASE_URL}/api/doctors/target-hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHospitals(hospRes.data);
      
      // Auto-select first hospital
      if (hospRes.data.length > 0) setTargetHospital(hospRes.data[0]);

    } catch (err) {
      console.error("Error loading data", err);
    }
  };

  // --- 2. CHECKBOX LOGIC (Select All / Single) ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = patients.map(p => p.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // --- 3. EXECUTE TRANSFER (Connects to Backend) ---
  const executeBatchTransfer = async () => {
    if (selectedIds.length === 0) return alert("Please select at least one patient.");
    if (!targetHospital) return alert("No target hospital selected.");

    setLoading(true);
    setTransferResult(null);

    try {
      const token = localStorage.getItem('token');
      
      // 👇 This matches the Backend 'BatchTransferRequest' model
      const payload = {
        record_ids: selectedIds,
        target_hospital_name: targetHospital
      };

      const res = await axios.post(`${API_BASE_URL}/api/transfer/execute-batch`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // --- 4. HANDLE SMART RESPONSE ---
      // The backend returns { success: [], skipped: [], failed: [] }
      setTransferResult(res.data);
      
      // Clear selection on success
      if (res.data.success.length > 0) setSelectedIds([]);

    } catch (err) {
      console.error(err);
      alert("Transfer Failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          📄 Patient Records
          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {patients.length} Total
          </span>
        </h2>
        
        {/* Transfer Controls */}
        <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
          <span className="text-sm font-semibold text-indigo-900">Transfer To:</span>
          
          <select 
            className="p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500"
            value={targetHospital}
            onChange={(e) => setTargetHospital(e.target.value)}
          >
            {hospitals.length === 0 && <option>No other hospitals found</option>}
            {hospitals.map(h => <option key={h} value={h}>{h}</option>)}
          </select>

          <button
            onClick={executeBatchTransfer}
            disabled={loading || selectedIds.length === 0}
            className={`px-5 py-2 rounded text-white font-bold text-sm shadow-sm transition-all ${
              loading || selectedIds.length === 0 
                ? "bg-gray-400 cursor-not-allowed opacity-50" 
                : "bg-indigo-600 hover:bg-indigo-700 hover:shadow"
            }`}
          >
            {loading ? "Processing..." : `Transfer Selected (${selectedIds.length})`}
          </button>
        </div>
      </div>

      {/* --- RESULT NOTIFICATION --- */}
      {transferResult && (
        <div className="mb-6 animate-fade-in">
          {transferResult.success.length > 0 && (
             <div className="p-3 bg-green-100 text-green-800 rounded border border-green-200 mb-2">
               ✅ <strong>Success:</strong> {transferResult.success.length} records securely transferred to {targetHospital}.
             </div>
          )}
          {transferResult.skipped.length > 0 && (
             <div className="p-3 bg-yellow-100 text-yellow-800 rounded border border-yellow-200">
               ⚠️ <strong>Skipped:</strong> {transferResult.skipped.length} records were NOT sent because identical data already exists at {targetHospital}.
             </div>
          )}
        </div>
      )}

      {/* --- TABLE SECTION --- */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full text-left bg-white">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th className="p-4 w-16 text-center border-b">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  onChange={handleSelectAll} 
                  checked={patients.length > 0 && selectedIds.length === patients.length}
                />
              </th>
              <th className="p-4 border-b">Patient ID</th>
              <th className="p-4 border-b">Current Diagnosis</th>
              <th className="p-4 border-b">Prescription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {patients.map((p) => (
              <tr 
                key={p.id} 
                className={`transition-colors ${selectedIds.includes(p.id) ? "bg-indigo-50/50" : "hover:bg-gray-50"}`}
              >
                <td className="p-4 text-center">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => handleSelectOne(p.id)}
                  />
                </td>
                <td className="p-4 font-mono font-medium text-gray-700">{p.patient_id}</td>
                <td className="p-4 text-gray-800 font-medium">{p.diagnosis}</td>
                <td className="p-4 text-gray-500">{p.prescription}</td>
              </tr>
            ))}
            
            {patients.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400 italic">
                  No patient records found in your database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BulkPatientList;