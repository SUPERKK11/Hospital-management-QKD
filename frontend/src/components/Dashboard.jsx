import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TransferControl from '../components/TransferControl';
import GovernmentView from '../components/GovernmentView';

// 🔴 FIX #8: Safer API URL handling. 
// If VITE_API_URL is missing in production, this will undefined (helping you catch config errors) rather than silently hitting localhost.
const API_BASE_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Data State
  const [records, setRecords] = useState([]); 
  const [isLoading, setIsLoading] = useState(false); // 🔴 FIX #5: Loading State
  
  // Doctor Inputs
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // --- 📐 FIX #3 & #4: ROBUST RESIZABLE LOGIC ---
  const [leftWidth, setLeftWidth] = useState(450);
  const containerRef = useRef(null); // Reference to the parent container
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize"; 
    document.body.style.userSelect = "none";
    
    // 🔴 FIX #4: Attach listeners ONLY when resizing starts
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
    
    // Cleanup listeners immediately
    window.removeEventListener("mousemove", resize);
    window.removeEventListener("mouseup", stopResizing);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing.current && containerRef.current) {
        // 🔴 FIX #3: Calculate width relative to container, not screen edge
        const containerLeft = containerRef.current.getBoundingClientRect().left;
        const newWidth = e.clientX - containerLeft;
        
        // Constraints
        if (newWidth > 300 && newWidth < window.innerWidth - 400) {
            setLeftWidth(newWidth);
        }
    }
  }, []);
  // --- END RESIZE LOGIC ---

  useEffect(() => {
    const token = localStorage.getItem("token");
    // 🔴 FIX #6: Role is read for UI only. API calls must still be validated by backend.
    const role = localStorage.getItem("role") || localStorage.getItem("user_type");
    const name = localStorage.getItem("full_name");

    if (!token) {
      navigate("/"); 
    } else {
      setUserRole(role); 
      setFullName(name);
      // Patients load data immediately; Doctors wait for search.
      if (role === "patient") {
        fetchPatientRecords(token);
      }
    }
  }, [navigate]);

  const fetchPatientRecords = async (token) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/records/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(response.data);
    } catch (err) {
      handleError(err);
    } finally {
        setIsLoading(false);
    }
  };

  // 🔴 FIX #2: Server-Side Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return alert("Please enter a Patient Email.");
    
    setIsLoading(true);
    setHasSearched(true);
    const token = localStorage.getItem("token");

    try {
        // Calls strictly the search endpoint
        const response = await axios.get(`${API_BASE_URL}/api/records/search`, {
            params: { email: searchQuery },
            headers: { Authorization: `Bearer ${token}` }
        });
        setRecords(response.data);
    } catch (err) {
        handleError(err);
        setRecords([]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `${API_BASE_URL}/api/records/create`,
        {
          patient_email: patientEmail,
          diagnosis: diagnosis,
          prescription: prescription, 
          notes: "Standard Visit" // Default value to prevent backend validation error
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Record created!");
      // Reset form
      setPatientEmail("");
      setDiagnosis("");
      setPrescription(""); 
      
      // If doctor was viewing this patient, refresh the list
      if (hasSearched && searchQuery === patientEmail) {
          handleSearch();
      }
    } catch (err) {
      handleError(err);
    } finally {
        setIsLoading(false);
    }
  };

  // 🔴 FIX #7: Centralized Error Handling
  const handleError = (err) => {
      console.error(err);
      const msg = err.response?.data?.detail || "Connection to server failed.";
      alert(`⚠️ Error: ${msg}`);
      
      // Optional: Redirect to login if token expired
      if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/");
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
                  <h3 className="font-bold text-lg">🏛️ Ministry of Health</h3>
                  <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">Logout</button>
              </nav>
              <div className="flex-1 overflow-auto p-8">
                  <GovernmentView />
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="flex-none bg-white p-4 shadow border-b border-gray-200 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg text-xl">🏥</div>
            <div>
                <h2 className="text-xl font-bold text-gray-800 leading-tight">Hospital Dashboard</h2>
                <p className="text-xs text-gray-500">
                    User: {fullName} | <span className="uppercase font-bold text-blue-600">{userRole}</span>
                </p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-medium transition">
            Logout
          </button>
      </header>

      {/* 🔴 FIX #3: Container Ref for accurate resizing */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden w-full relative">
        
        {/* === LEFT PANEL: DOCTOR CONTROLS === */}
        {userRole === "doctor" && (
            <div 
                className="flex flex-col bg-white border-r border-gray-300 h-full z-10 shadow-xl"
                style={{ width: leftWidth, minWidth: 300 }} 
            >
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex-none">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        📝 New Diagnosis
                    </h3>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleCreateRecord} className="flex flex-col gap-5">
                        {/* Form Inputs ... */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Patient Email</label>
                            <input 
                                type="email" 
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
                                value={diagnosis} 
                                onChange={(e) => setDiagnosis(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 border border-gray-300 rounded focus:border-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <label className="text-xs font-bold text-gray-500 uppercase">Prescription</label>
                            <textarea 
                                value={prescription} 
                                onChange={(e) => setPrescription(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 border border-gray-300 rounded focus:border-blue-500 outline-none text-sm resize-none h-40"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full py-3 rounded font-bold transition shadow-sm mt-auto text-white
                                ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}
                            `}
                        >
                            {isLoading ? "Saving..." : "Save Record"}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* === RESIZE HANDLE === */}
        {userRole === "doctor" && (
            <div
                className="w-4 -ml-2 cursor-col-resize z-50 flex items-center justify-center hover:bg-blue-100 transition-colors group"
                onMouseDown={startResizing}
                style={{ position: 'relative', left: 0 }} 
            >
                <div className="w-1 h-8 bg-gray-300 rounded-full border border-gray-400 group-hover:bg-blue-400"></div>
            </div>
        )}

        {/* === RIGHT PANEL: RECORDS === */}
        <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
            
            {/* Header / Search */}
            <div className="flex-none p-4 border-b border-gray-200 bg-white shadow-sm z-10 flex flex-col md:flex-row justify-between items-center gap-3">
                <h3 className="font-bold text-gray-800 text-lg">
                     {userRole === "doctor" ? "🔍 Patient Search" : "📂 My Medical History"}
                </h3>

                {userRole === "doctor" && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="text" 
                            placeholder="Search by email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 md:w-64 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button 
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-bold disabled:opacity-50"
                        >
                            {isLoading ? "..." : "Fetch"}
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                
                {/* 🔴 FIX #5: Loading Indicator */}
                {isLoading && (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* 🔴 FIX #1: Correct Empty States per Role */}
                
                {/* CASE: Doctor hasn't searched yet */}
                {!isLoading && userRole === "doctor" && !hasSearched && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none opacity-60">
                        <div className="text-6xl mb-4">👈</div>
                        <p className="text-lg">Diagnose patient on the left</p>
                        <p className="text-sm">Or search email to view history</p>
                    </div>
                )}

                {/* CASE: No Results (Shared Logic) */}
                {!isLoading && hasSearched && records.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                        <div className="text-4xl mb-2">🚫</div>
                        <p>No records found for this patient.</p>
                    </div>
                )}

                {/* CASE: Patient with 0 records (Initial Load) */}
                {!isLoading && userRole === "patient" && records.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <p className="text-lg">You have no medical records yet.</p>
                    </div>
                )}

                {/* Record Cards */}
                {!isLoading && records.map((rec) => (
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
                            <span>Doctor: {rec.doctor_id || "Unknown"}</span>
                            <span>Hospital: {rec.hospital || "General"}</span>
                        </div>

                        {/* Transfer Control */}
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