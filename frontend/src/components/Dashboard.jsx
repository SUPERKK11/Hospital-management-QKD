import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TransferControl from '../components/TransferControl';
import GovernmentView from '../components/GovernmentView';

import BulkPatientList from './components/BulkPatientList';
import Inbox from './components/Inbox';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [userRole, setUserRole] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Data State
  const [allRecords, setAllRecords] = useState([]); 
  const [displayedRecords, setDisplayedRecords] = useState([]); 
  
  // Doctor: Form Inputs
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 

  // Doctor: Search Inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // --- 📐 RESIZABLE LOGIC START ---
  const [leftWidth, setLeftWidth] = useState(400); // Initial width of Left Panel (px)
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize"; // Change cursor globally
    document.body.style.userSelect = "none";   // Prevent text selection while dragging
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }, []);

  const resize = useCallback((e) => {
    if (isResizing.current) {
      // Limit min/max width constraints (Min 300px, Max 800px)
      const newWidth = Math.min(Math.max(e.clientX, 300), window.innerWidth - 400);
      setLeftWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);
  // --- 📐 RESIZABLE LOGIC END ---

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") || localStorage.getItem("user_type");
    const name = localStorage.getItem("full_name");

    if (!token) {
      navigate("/"); 
    } else {
      setUserRole(role); 
      setFullName(name);
      
      if (role !== "government") {
        initialFetch(token, role);
      }
    }
  }, [navigate]);

  const initialFetch = async (token, role) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/records/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllRecords(response.data);
      
      if (role === 'patient') {
        setDisplayedRecords(response.data);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      alert("Please enter a Patient Email.");
      return;
    }
    setHasSearched(true);
    const results = allRecords.filter(r => 
      r.patient_email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setDisplayedRecords(results);
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `${API_BASE_URL}/api/records/create`,
        {
          patient_email: patientEmail,
          diagnosis: diagnosis,
          prescription: prescription, 
          notes: "Created via Dashboard"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Record created successfully!");
      setPatientEmail("");
      setDiagnosis("");
      setPrescription(""); 
      initialFetch(token, userRole);

    } catch (err) {
      console.error(err);
      alert("Error creating record.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (userRole === "government") {
      return (
          <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
              <nav className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-md flex-none z-10">
                  <h3 className="font-bold text-lg">🏛️ Ministry of Health Portal</h3>
                  <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">Logout</button>
              </nav>
              <div className="flex-1 overflow-auto p-8">
                  <GovernmentView />
              </div>
          </div>
      );
  }

  // --- MAIN DASHBOARD LAYOUT ---
  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="flex-none bg-white p-4 shadow-sm border-b border-gray-200 flex justify-between items-center z-20 relative">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg text-xl">🏥</div>
            <div>
                <h2 className="text-xl font-bold text-gray-800 leading-tight">Hospital Dashboard</h2>
                <p className="text-xs text-gray-500">User: {fullName} | {userRole === "doctor" ? "👨‍⚕️ Doctor" : "👤 Patient"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-medium transition">
            Logout
          </button>
      </header>

      {/* SPLIT CONTAINER */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        
        {/* === LEFT PANEL: CREATE RECORD (Doctors Only) === */}
        {userRole === "doctor" && (
            <div 
                className="flex flex-col bg-white border-r border-gray-200 h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10"
                style={{ width: leftWidth, minWidth: 300 }} // Dynamic Width
            >
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex-none">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        📝 New Diagnosis
                    </h3>
                </div>
                
                <div className="p-5 overflow-y-auto flex-1">
                    <form onSubmit={handleCreateRecord} className="flex flex-col gap-5">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Patient Email</label>
                            <input 
                                type="email" 
                                placeholder="patient@gmail.com" 
                                value={patientEmail} 
                                onChange={(e) => setPatientEmail(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Diagnosis</label>
                            <input 
                                type="text" 
                                placeholder="ex: Viral Fever" 
                                value={diagnosis} 
                                onChange={(e) => setDiagnosis(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Prescription</label>
                            <textarea 
                                placeholder="Treatment details..." 
                                value={prescription} 
                                onChange={(e) => setPrescription(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none shadow-sm h-48"
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md mt-auto">
                            Submit Record
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* === DRAGGER BAR (The Handle) === */}
        {userRole === "doctor" && (
            <div
                className="w-2 hover:w-2 bg-gray-100 hover:bg-blue-400 cursor-col-resize flex-none transition-colors duration-150 flex items-center justify-center group z-20 border-l border-r border-gray-200"
                onMouseDown={startResizing}
            >
                {/* Visual Grip Handle */}
                <div className="h-8 w-1 bg-gray-300 rounded-full group-hover:bg-white"></div>
            </div>
        )}

        {/* === RIGHT PANEL: HISTORY (Takes remaining space) === */}
        <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden relative">
            
            {/* Header */}
            <div className="flex-none p-5 border-b border-gray-200 bg-white shadow-sm z-10">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-lg">
                        {userRole === "doctor" ? "🔍 Patient History Lookup" : "📂 My Medical History"}
                    </h3>
                    {hasSearched && userRole === "doctor" && (
                         <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                            {displayedRecords.length} Records Found
                         </span>
                    )}
                </div>

                {/* Search Bar */}
                {userRole === "doctor" && (
                    <div className="flex gap-2 max-w-2xl">
                        <input 
                            type="text" 
                            placeholder="Enter Patient Email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm shadow-inner"
                        />
                        <button 
                            onClick={handleSearch}
                            className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-black font-semibold text-sm transition shadow-sm whitespace-nowrap"
                        >
                            Fetch History
                        </button>
                    </div>
                )}
            </div>


            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
                {/* ============================================================ */}
                {/* START PASTE: BULK & INBOX SECTION (Only for Doctors)        */}
                {/* ============================================================ */}
                {userRole === "doctor" && (
                    <div className="space-y-8 mb-10">
                        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                🚀 Bulk Transfer Management
                            </h3>
                            <BulkPatientList />
                        </div>

                        <hr className="border-gray-300" />

                        <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                📥 Received Records (Inbox)
                            </h3>
                            <Inbox />
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-400 py-4">
                            <div className="h-px bg-gray-300 flex-1"></div>
                            <span className="text-xs font-bold uppercase tracking-widest">End of Management Section</span>
                            <div className="h-px bg-gray-300 flex-1"></div>
                        </div>
                    </div>
                )}
                {/* ============================================================ */}
                {/* END PASTE                                                   */}
                {/* ============================================================ */}
                
                {/* Doctor Initial State */}
                {userRole === "doctor" && !hasSearched && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none">
                        <div className="text-6xl mb-4 opacity-50">👈</div>
                        <p className="text-lg font-medium">Use the "New Diagnosis" panel to add data</p>
                        <p className="text-sm">Or search above to view history</p>
                    </div>
                )}

                {/* No Results */}
                {hasSearched && displayedRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <div className="text-5xl mb-3">🚫</div>
                        <p className="font-medium">No records found</p>
                    </div>
                )}

                {/* Records Grid */}
                {displayedRecords.map((rec) => (
                    <div key={rec.id || rec._id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">{rec.diagnosis}</h4>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase tracking-wider border border-gray-200">
                                {rec.hospital || "Secured"}
                            </span>
                        </div>
                        
                        <div className="bg-blue-50/50 p-4 rounded-lg text-gray-800 text-sm mb-4 border-l-4 border-blue-400 leading-relaxed">
                            {rec.prescription}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 uppercase font-bold">Patient Email</span>
                                <span className="text-sm text-gray-600">{rec.patient_email}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-xs text-gray-400 uppercase font-bold">Date</span>
                                <span className="text-sm text-gray-600">{new Date(rec.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Transfer Control Area */}
                        {userRole === "doctor" && (
                            <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                                <TransferControl recordId={rec.id || rec._id} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;