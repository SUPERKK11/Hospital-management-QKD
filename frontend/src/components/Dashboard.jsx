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
  const [allRecords, setAllRecords] = useState([]); // Stores raw data from DB
  const [displayedRecords, setDisplayedRecords] = useState([]); // What actually shows on screen
  
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
      
      // If Patient: Show history immediately
      // If Doctor: Wait for manual search (don't show anything yet)
      if (role !== "government") {
        initialFetch(token, role);
      }
    }
  }, [navigate]);

  // 1. Initial Load (Background)
  const initialFetch = async (token, role) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/records/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllRecords(response.data);
      
      // Patients see data immediately. Doctors see nothing yet.
      if (role === 'patient') {
        setDisplayedRecords(response.data);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  };

  // 2. Manual "Fetch" Action (Triggered only on Button Click)
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      alert("Please enter a Patient Email or ID.");
      return;
    }
    
    setHasSearched(true);

    // Filter the records ONLY now
    const results = allRecords.filter(r => 
      r.patient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.abha_id && r.abha_id.includes(searchQuery))
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
      
      // Refresh background data
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

  // --- GOVERNMENT VIEW (Unchanged) ---
  if (userRole === "government") {
      return (
          <div className="h-screen flex flex-col bg-gray-100">
              <nav className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-md shrink-0">
                  <h3 className="font-bold text-lg">🏛️ Ministry of Health Portal</h3>
                  <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">Logout</button>
              </nav>
              <div className="flex-1 overflow-auto p-8">
                  <GovernmentView />
              </div>
          </div>
      );
  }

  // --- MAIN LAYOUT (Fixed Screen, No Body Scroll) ---
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden font-sans">
      
      {/* 1. TOP HEADER (Fixed Height) */}
      <header className="bg-white p-4 shadow-sm border-b border-gray-200 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">🏥</div>
            <div>
                <h2 className="text-xl font-bold text-gray-800 leading-tight">Hospital Dashboard</h2>
                <p className="text-xs text-gray-500">User: {fullName} | Role: {userRole}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm font-medium">
            Logout
          </button>
      </header>

      {/* 2. MAIN CONTENT AREA (Fills remaining height) */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 max-w-7xl mx-auto w-full">
        
        {/* === LEFT COLUMN: CREATE RECORD (Fixed, does not scroll) === */}
        {userRole === "doctor" && (
            <div className="w-1/3 min-w-[350px] bg-white rounded-xl shadow border border-gray-200 flex flex-col h-fit">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        📝 New Diagnosis
                    </h3>
                </div>
                
                <div className="p-5">
                    <form onSubmit={handleCreateRecord} className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Patient Email</label>
                            <input 
                                type="email" 
                                placeholder="ex: patient@gmail.com" 
                                value={patientEmail} 
                                onChange={(e) => setPatientEmail(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                                className="w-full p-3 mt-1 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Prescription</label>
                            <textarea 
                                placeholder="Treatment details..." 
                                value={prescription} 
                                onChange={(e) => setPrescription(e.target.value)} 
                                required 
                                className="w-full p-3 mt-1 bg-gray-50 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                            />
                        </div>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-sm mt-2">
                            Save Record
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* === RIGHT COLUMN: HISTORY (Independent Scroll) === */}
        <div className="flex-1 bg-white rounded-xl shadow border border-gray-200 flex flex-col overflow-hidden">
            
            {/* A. History Header (Fixed) */}
            <div className="p-5 border-b border-gray-100 bg-white shrink-0">
                <h3 className="font-bold text-gray-800 mb-3">
                    {userRole === "doctor" ? "🔍 Patient History Lookup" : "📂 My Medical History"}
                </h3>

                {/* Search Bar */}
                {userRole === "doctor" && (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Enter Patient Email (e.g. alice@example.com)" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-gray-50"
                        />
                        <button 
                            onClick={handleSearch}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm transition shadow-sm"
                        >
                            Fetch History
                        </button>
                    </div>
                )}
            </div>

            {/* B. Scrollable Content Area (Only this part moves) */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50 space-y-4">
                
                {/* State 1: Doctor hasn't clicked Fetch yet */}
                {userRole === "doctor" && !hasSearched && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-lg font-medium">Enter an email and click Fetch</p>
                        <p className="text-sm">Patient history will appear here.</p>
                    </div>
                )}

                {/* State 2: No Results Found */}
                {hasSearched && displayedRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <div className="text-5xl mb-3">🚫</div>
                        <p className="font-medium">No records found</p>
                    </div>
                )}

                {/* State 3: Show Records */}
                {displayedRecords.map((rec) => (
                    <div key={rec.id || rec._id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg text-indigo-900">{rec.diagnosis}</h4>
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider border border-indigo-100">
                                {rec.hospital || "Secured"}
                            </span>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded text-gray-700 text-sm mb-3">
                            <strong>Rx:</strong> {rec.prescription}
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-2">
                            <span>Patient: {rec.patient_email}</span>
                            <span>Date: {new Date(rec.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Transfer Control (Only for Doctor) */}
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