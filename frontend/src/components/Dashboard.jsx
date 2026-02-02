import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TransferControl from '../components/TransferControl';
import GovernmentView from '../components/GovernmentView';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [userRole, setUserRole] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Data State
  const [allRecords, setAllRecords] = useState([]); 
  const [displayedRecords, setDisplayedRecords] = useState([]); 
  
  // Doctor Inputs
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // --- 📐 FIXED RESIZABLE LOGIC ---
  const [leftWidth, setLeftWidth] = useState(450); // Default width
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize"; 
    document.body.style.userSelect = "none";   
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }, []);

  const resize = useCallback((e) => {
    if (isResizing.current) {
      // Logic: Mouse X position exactly equals width because we are full-screen now
      const newWidth = e.clientX;
      
      // Constraints: Don't let it get too small (300px) or too big (Screen - 400px)
      if (newWidth > 300 && newWidth < window.innerWidth - 400) {
        setLeftWidth(newWidth);
      }
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
  // --- END RESIZE LOGIC ---

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
    if (!searchQuery.trim()) return alert("Please enter a Patient Email.");
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
      alert("✅ Record created!");
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

  // --- GOV VIEW (UNCHANGED) ---
  if (userRole === "government") {
      return (
          <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
              <nav className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-md flex-none z-10">
                  <h3 className="font-bold text-lg">🏛️ Ministry of Health</h3>
                  <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">Logout</button>
              </nav>
              <div className="flex-1 overflow-auto p-8">
                  <GovernmentView />
              </div>
          </div>
      );
  }

  // --- MAIN LAYOUT ---
  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      
      {/* HEADER - Full Width */}
      <header className="flex-none bg-white p-4 shadow border-b border-gray-200 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg text-xl">🏥</div>
            <div>
                <h2 className="text-xl font-bold text-gray-800 leading-tight">Hospital Dashboard</h2>
                <p className="text-xs text-gray-500">User: {fullName} | {userRole}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-medium transition">
            Logout
          </button>
      </header>

      {/* SPLIT CONTAINER - Full Width (Removed mx-auto/max-w constraints) */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        
        {/* === LEFT PANEL: DIAGNOSIS FORM === */}
        {userRole === "doctor" && (
            <div 
                className="flex flex-col bg-white border-r border-gray-300 h-full z-10 shadow-lg"
                style={{ width: leftWidth, minWidth: 300 }} 
            >
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex-none">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        📝 New Diagnosis
                    </h3>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleCreateRecord} className="flex flex-col gap-5">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Patient Email</label>
                            <input 
                                type="email" 
                                placeholder="patient@gmail.com" 
                                value={patientEmail} 
                                onChange={(e) => setPatientEmail(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 border border-gray-300 rounded focus:border-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Diagnosis</label>
                            <input 
                                type="text" 
                                placeholder="ex: Viral Fever" 
                                value={diagnosis} 
                                onChange={(e) => setDiagnosis(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 border border-gray-300 rounded focus:border-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="text-xs font-bold text-gray-500 uppercase">Prescription</label>
                            <textarea 
                                placeholder="Treatment details..." 
                                value={prescription} 
                                onChange={(e) => setPrescription(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 border border-gray-300 rounded focus:border-blue-500 outline-none text-sm resize-none h-40"
                            />
                        </div>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition shadow-sm mt-auto">
                            Save Record
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* === DRAGGABLE HANDLE === */}
        {userRole === "doctor" && (
            <div
                className="w-4 -ml-2 cursor-col-resize z-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
                onMouseDown={startResizing}
                style={{ position: 'relative', left: 0 }} 
            >
                {/* Visual Grip Line */}
                <div className="w-1 h-8 bg-gray-300 rounded-full border border-gray-400"></div>
            </div>
        )}

        {/* === RIGHT PANEL: HISTORY === */}
        <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
            
            {/* Search Header */}
            <div className="flex-none p-4 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">
                     {userRole === "doctor" ? "🔍 Patient History" : "📂 My Medical History"}
                </h3>

                {userRole === "doctor" && (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Enter Patient Email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-64 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button 
                            onClick={handleSearch}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-bold"
                        >
                            Fetch
                        </button>
                    </div>
                )}
            </div>

            {/* Scrollable History List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                
                {/* Doctor Empty State */}
                {userRole === "doctor" && !hasSearched && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none opacity-60">
                        <div className="text-6xl mb-4">👈</div>
                        <p className="text-lg">Use the form on the left to diagnose.</p>
                        <p className="text-sm">Or use the search bar to view history.</p>
                    </div>
                )}

                {/* No Results */}
                {hasSearched && displayedRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <div className="text-4xl mb-2">🚫</div>
                        <p>No records found</p>
                    </div>
                )}

                {/* Results */}
                {displayedRecords.map((rec) => (
                    <div key={rec.id || rec._id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-lg text-blue-900">{rec.diagnosis}</h4>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border">
                                {new Date(rec.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded text-gray-800 text-sm mb-3 border-l-4 border-gray-300">
                            {rec.prescription}
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-50">
                            <span>Patient: {rec.patient_email}</span>
                            <span>Hospital: {rec.hospital || "Secured"}</span>
                        </div>

                        {/* Transfer Button */}
                        {userRole === "doctor" && (
                            <div className="mt-3">
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