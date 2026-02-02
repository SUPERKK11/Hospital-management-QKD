import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TransferControl from '../components/TransferControl';
import GovernmentView from '../components/GovernmentView';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [userRole, setUserRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [records, setRecords] = useState([]); 
  
  // Doctor: Create Record State
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 

  // Doctor: Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
        fetchRecords(token);
      }
    }
  }, [navigate]);

  const fetchRecords = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/records/my-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(response.data);
    } catch (err) {
      console.error("Error fetching records:", err);
    }
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
      fetchRecords(token); 

    } catch (err) {
      console.error(err);
      alert("Error creating record.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // --- LOGIC: SEARCH FILTER ---
  const displayedRecords = userRole === "doctor" 
    ? records.filter(r => 
        r.patient_email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (r.abha_id && r.abha_id.includes(searchQuery)) // Future-proof for ABHA
      )
    : records;

  // --- GOVERNMENT VIEW ---
  if (userRole === "government") {
      return (
          <div className="min-h-screen bg-gray-100 font-sans">
              <nav className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-md">
                  <h3 className="font-bold text-lg">🏛️ Ministry of Health Portal</h3>
                  <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition">Logout</button>
              </nav>
              <div className="max-w-6xl mx-auto mt-8">
                  <GovernmentView />
              </div>
          </div>
      );
  }

  // --- STANDARD DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🏥 Hospital Dashboard</h2>
            <p className="text-gray-500 text-sm">Logged in as: <strong>{fullName}</strong> ({userRole})</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition shadow font-medium text-sm">Logout</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
            
            {/* LEFT COLUMN: ACTIONS (Create Record) */}
            {userRole === "doctor" && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-fit">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📝 <span className="underline decoration-green-400">New Diagnosis</span>
                    </h3>
                    <form onSubmit={handleCreateRecord} className="flex flex-col gap-4">
                        <input 
                            type="email" 
                            placeholder="Patient Email" 
                            value={patientEmail} 
                            onChange={(e) => setPatientEmail(e.target.value)} 
                            required 
                            className="p-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        />
                        <input 
                            type="text" 
                            placeholder="Diagnosis" 
                            value={diagnosis} 
                            onChange={(e) => setDiagnosis(e.target.value)} 
                            required 
                            className="p-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                        />
                        <textarea 
                            placeholder="Prescription / Notes" 
                            value={prescription} 
                            onChange={(e) => setPrescription(e.target.value)} 
                            required 
                            className="p-3 bg-gray-50 border rounded-lg h-32 focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none"
                        />
                        <button type="submit" className="bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-sm">
                            Save Record
                        </button>
                    </form>
                </div>
            )}

            {/* RIGHT COLUMN: HISTORY (Scrollable) */}
            <div className={`flex flex-col ${userRole === "doctor" ? "lg:col-span-2" : "lg:col-span-3"} bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden`}>
                
                {/* Fixed Header for History Section */}
                <div className="p-5 border-b border-gray-100 bg-white z-10">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">
                        {userRole === "doctor" ? "🔍 Patient History Lookup" : "📂 My Medical History"}
                    </h3>

                    {/* Search Bar (Doctor Only) */}
                    {userRole === "doctor" && (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Enter Patient Email or ABHA ID..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                            />
                            <button 
                                onClick={() => setIsSearching(true)}
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm transition"
                            >
                                Search
                            </button>
                        </div>
                    )}
                </div>

                {/* SCROLLABLE CONTENT AREA (The "Chat Box" Effect) */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50 space-y-4 h-[500px] scroll-smooth">
                    
                    {/* Empty State */}
                    {userRole === "doctor" && searchQuery === "" && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <span className="text-4xl mb-2">🔍</span>
                            <p>Search for a patient to view their records.</p>
                        </div>
                    )}

                    {/* No Results */}
                    {userRole === "doctor" && searchQuery !== "" && displayedRecords.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-red-400">
                            <span className="text-4xl mb-2">🚫</span>
                            <p>No records found for "{searchQuery}"</p>
                        </div>
                    )}

                    {/* Records List */}
                    {(userRole === "patient" || (userRole === "doctor" && searchQuery !== "")) && (
                        displayedRecords.map((rec) => (
                        <div key={rec.id || rec._id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-indigo-900">{rec.diagnosis}</h4>
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider border border-indigo-100">
                                    {rec.hospital || "Secured"}
                                </span>
                            </div>
                            
                            <p className="text-gray-700 text-sm mb-3 bg-gray-50 p-2 rounded">
                                <strong>Rx:</strong> {rec.prescription}
                            </p>

                            <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-2">
                                <span>Patient: {rec.patient_email}</span>
                                <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                            </div>

                            {/* Transfer Control - Shows nicely at bottom of card */}
                            {userRole === "doctor" && (
                                <div className="mt-3">
                                    <TransferControl recordId={rec.id || rec._id} />
                                </div>
                            )}
                        </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;