import { useEffect, useState } from "react";
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
  
  // Doctor: Form Inputs
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 

  // Doctor: Search Inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

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

  // --- MAIN LAYOUT START ---
  return (
    // 1. MAIN CONTAINER: Takes 100% height of viewport (h-screen), forbids body scroll (overflow-hidden)
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden font-sans">
      
      {/* 2. HEADER: Fixed height (flex-none), stays at top */}
      <header className="flex-none bg-white p-4 shadow-sm border-b border-gray-200 flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg text-xl">🏥</div>
            <div>
                <h2 className="text-xl font-bold text-gray-800 leading-tight">Hospital Dashboard</h2>
                <p className="text-xs text-gray-500">User: {fullName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-medium transition">
            Logout
          </button>
      </header>

      {/* 3. CONTENT AREA: Fills remaining vertical space (flex-1), does NOT scroll itself */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* === LEFT COLUMN: CREATE RECORD === */}
        {/* 'overflow-auto' here means if this specific box gets too tall, only IT scrolls, not the page */}
        {userRole === "doctor" && (
            <div className="w-1/3 min-w-[320px] flex flex-col bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex-none">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        📝 New Diagnosis
                    </h3>
                </div>
                
                <div className="p-5 overflow-y-auto">
                    <form onSubmit={handleCreateRecord} className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Patient Email</label>
                            <input 
                                type="email" 
                                placeholder="patient@gmail.com" 
                                value={patientEmail} 
                                onChange={(e) => setPatientEmail(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition"
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
                                className="w-full p-3 mt-1 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Prescription</label>
                            <textarea 
                                placeholder="Details..." 
                                value={prescription} 
                                onChange={(e) => setPrescription(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 bg-gray-50 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none transition"
                            />
                        </div>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-sm mt-2">
                            Save Record
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* === RIGHT COLUMN: HISTORY (The Chat Box Effect) === */}
        {/* flex-1: Fills width. flex-col: Stacks header/list. overflow-hidden: Containers don't leak scrollbars */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden h-full">
            
            {/* A. Fixed Header inside History Box */}
            <div className="flex-none p-4 border-b border-gray-100 bg-gray-50 z-10">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800">
                        {userRole === "doctor" ? "🔍 Patient History" : "📂 My Medical History"}
                    </h3>
                    {hasSearched && userRole === "doctor" && (
                         <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Results: {displayedRecords.length}
                         </span>
                    )}
                </div>

                {/* Search Bar */}
                {userRole === "doctor" && (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Enter Patient Email..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        />
                        <button 
                            onClick={handleSearch}
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm transition shadow-sm whitespace-nowrap"
                        >
                            Fetch Records
                        </button>
                    </div>
                )}
            </div>

            {/* B. SCROLLABLE AREA (The only thing that moves) */}
            {/* flex-1: Takes remaining height. overflow-y-auto: Activates scrollbar inside div */}
            <div className="flex-1 overflow-y-auto p-4 bg-white space-y-4">
                
                {/* State 1: Waiting for search */}
                {userRole === "doctor" && !hasSearched && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                        <div className="text-5xl mb-2">👋</div>
                        <p>Search to view history</p>
                    </div>
                )}

                {/* State 2: No Results */}
                {hasSearched && displayedRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="text-4xl mb-2">🚫</div>
                        <p>No records found</p>
                    </div>
                )}

                {/* State 3: List Data */}
                {displayedRecords.map((rec) => (
                    <div key={rec.id || rec._id} className="group bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg text-gray-800">{rec.diagnosis}</h4>
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {new Date(rec.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded text-gray-700 text-sm mb-3 border-l-4 border-blue-400">
                            {rec.prescription}
                        </div>

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-400 truncate max-w-[200px]">
                                Patient: {rec.patient_email}
                            </span>
                            
                            {/* Transfer Control */}
                            {userRole === "doctor" && (
                                <TransferControl recordId={rec.id || rec._id} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;