import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// We will still keep TransferControl for individual actions, 
// but add a batch handler here.
import TransferControl from '../components/TransferControl';
import GovernmentView from '../components/GovernmentView';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [userRole, setUserRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [allRecords, setAllRecords] = useState([]); 
  const [displayedRecords, setDisplayedRecords] = useState([]); 
  
  // --- 🆕 BATCH SELECTION STATE ---
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchTargetHospital, setBatchTargetHospital] = useState("Hospital B");
  const [batchResult, setBatchResult] = useState(null);

  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [hospitals, setHospitals] = useState(["Hospital A", "Hospital B", "Hospital C"]); 
  const [selectedHospital, setSelectedHospital] = useState("");
  const [doctorsList, setDoctorsList] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

  // --- 📐 RESIZABLE LOGIC (Omitted for brevity, keep your current code) ---
  const [leftWidth, setLeftWidth] = useState(400); 
  const isResizing = useRef(false);
  // ... (Keep your startResizing, stopResizing, resize functions here)

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") || localStorage.getItem("user_type");
    const name = localStorage.getItem("full_name");
    if (!token) { navigate("/"); } 
    else {
      setUserRole(role); 
      setFullName(name);
      if (role !== "government") initialFetch(token, role);
    }
  }, [navigate]);

  const initialFetch = async (token, role) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/records/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllRecords(response.data);
      if (role === 'patient') setDisplayedRecords(response.data);
    } catch (err) { console.error("Error fetching records:", err); }
  };

  // --- 🆕 BATCH SELECTION HANDLERS ---
  const toggleSelectAll = () => {
    if (selectedRecordIds.length === displayedRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(displayedRecords.map(r => r.id || r._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedRecordIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchTransfer = async () => {
    if (selectedRecordIds.length === 0) return alert("Select records first!");
    setIsBatchLoading(true);
    setBatchResult(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/transfer/execute-batch`,
        {
          record_ids: selectedRecordIds,
          target_hospital_name: batchTargetHospital
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBatchResult(response.data);
      setSelectedRecordIds([]); // Clear selection on completion
    } catch (err) {
      alert("Batch transfer failed");
    } finally {
      setIsBatchLoading(false);
    }
  };

  // ... (Keep handleHospitalChange, handleSearch, handleCreateRecord, handleLogout)

  if (userRole === "government") { /* ... (Keep your GovernmentView) ... */ }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      <header className="flex-none bg-white p-4 shadow-sm border-b border-gray-200 flex justify-between items-center z-20">
          {/* ... Header Content ... */}
      </header>

      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* LEFT PANEL */}
        <div className="flex flex-col bg-white border-r border-gray-200 h-full shadow-sm z-10" style={{ width: leftWidth, minWidth: 300 }}>
             {/* ... Left Panel Content (New Diagnosis / Find Doctor) ... */}
        </div>

        {/* DRAGGER */}
        <div className="w-2 bg-gray-100 hover:bg-blue-400 cursor-col-resize z-20" onMouseDown={startResizing}></div>

        {/* RIGHT PANEL: HISTORY */}
        <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
            
            {/* Header / Search Area */}
            <div className="flex-none p-5 border-b border-gray-200 bg-white shadow-sm z-10">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-lg">
                        {userRole === "doctor" ? "🔍 Patient History" : "📂 My Medical History"}
                    </h3>
                    
                    {/* 🆕 BATCH ACTION BAR (Only for Doctors) */}
                    {userRole === "doctor" && displayedRecords.length > 0 && (
                        <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                             <label className="flex items-center gap-2 text-xs font-bold text-blue-700">
                                <input 
                                    type="checkbox" 
                                    onChange={toggleSelectAll} 
                                    checked={selectedRecordIds.length === displayedRecords.length && displayedRecords.length > 0}
                                />
                                SELECT ALL
                             </label>
                             <select 
                                value={batchTargetHospital} 
                                onChange={(e) => setBatchTargetHospital(e.target.value)}
                                className="text-xs p-1 border rounded"
                             >
                                <option>Hospital B</option>
                                <option>Hospital C</option>
                             </select>
                             <button 
                                onClick={handleBatchTransfer}
                                disabled={isBatchLoading || selectedRecordIds.length === 0}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 disabled:bg-gray-400"
                             >
                                {isBatchLoading ? "Sending..." : `Transfer (${selectedRecordIds.length})`}
                             </button>
                        </div>
                    )}
                </div>

                {/* 🆕 BATCH RESULT MESSAGES */}
                {batchResult && (
                    <div className="mb-4 text-xs">
                        {batchResult.success.length > 0 && (
                            <div className="p-2 bg-green-100 text-green-700 rounded mb-1">
                                ✅ {batchResult.success.length} records transferred successfully.
                            </div>
                        )}
                        {batchResult.skipped.length > 0 && (
                            <div className="p-2 bg-yellow-100 text-yellow-700 rounded">
                                ⚠️ {batchResult.skipped.length} skipped (Duplicate info already exists at destination).
                            </div>
                        )}
                    </div>
                )}

                {/* Search Bar Code... */}
            </div>

            {/* Scrollable Records List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {displayedRecords.map((rec) => (
                    <div key={rec.id || rec._id} className={`bg-white p-5 rounded-xl border transition-all ${selectedRecordIds.includes(rec.id || rec._id) ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                {/* 🆕 CHECKBOX PER RECORD */}
                                {userRole === "doctor" && (
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4" 
                                        checked={selectedRecordIds.includes(rec.id || rec._id)}
                                        onChange={() => toggleSelectOne(rec.id || rec._id)}
                                    />
                                )}
                                <h4 className="font-bold text-lg text-gray-900">{rec.diagnosis}</h4>
                            </div>
                            <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded uppercase">{rec.hospital || "Secured"}</span>
                        </div>
                        
                        <div className="bg-blue-50/50 p-4 rounded-lg text-sm mb-4 border-l-4 border-blue-400">
                            {rec.prescription}
                        </div>

                        {/* ... Date and Email footer ... */}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;