import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TransferControl from '../components/TransferControl';
import GovernmentView from '../components/GovernmentView';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const [userRole, setUserRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [records, setRecords] = useState([]); // Stores ALL data fetched
  
  // Doctor: Create Record State
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 

  // Doctor: Search State (NEW) 🔍
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
      fetchRecords(token); // Refresh local data

    } catch (err) {
      console.error(err);
      alert("Error creating record.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // --- LOGIC: FILTER RECORDS ---
  // If Doctor: Only show records if they match the Search Query
  // If Patient: Show all their records immediately
  const displayedRecords = userRole === "doctor" 
    ? records.filter(r => r.patient_email.toLowerCase() === searchQuery.toLowerCase())
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
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow-sm border-l-4 border-blue-500">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🏥 Hospital Dashboard</h2>
            <p className="text-gray-500">Logged in as: <strong>{fullName}</strong> ({userRole})</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition shadow">Logout</button>
        </div>

        {/* --- DOCTOR: CREATE RECORD --- */}
        {userRole === "doctor" && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📝 Create New Record</h3>
            <form onSubmit={handleCreateRecord} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    type="email" 
                    placeholder="Patient Email" 
                    value={patientEmail} 
                    onChange={(e) => setPatientEmail(e.target.value)} 
                    required 
                    className="p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input 
                    type="text" 
                    placeholder="Diagnosis" 
                    value={diagnosis} 
                    onChange={(e) => setDiagnosis(e.target.value)} 
                    required 
                    className="p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <textarea 
                placeholder="Prescription / Treatment Plan" 
                value={prescription} 
                onChange={(e) => setPrescription(e.target.value)} 
                required 
                className="p-3 border rounded h-20 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="submit" className="bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition shadow-sm w-full md:w-auto md:px-8">
                Save Record
              </button>
            </form>
          </div>
        )}

        {/* --- RECORD SECTION --- */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-700">
                {userRole === "doctor" ? "🔍 Patient History Lookup" : "📂 My Medical History"}
            </h3>
          </div>

          {/* 🔍 DOCTOR SEARCH BAR */}
          {userRole === "doctor" && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6 flex gap-2 items-center">
                <input 
                    type="text" 
                    placeholder="Enter Patient Email to view history..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 p-3 border rounded shadow-sm focus:outline-none focus:border-blue-500"
                />
                <button 
                    onClick={() => setIsSearching(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded shadow hover:bg-blue-700 font-semibold"
                >
                    Search Records
                </button>
            </div>
          )}

          {/* RESULTS DISPLAY */}
          <div className="space-y-4">
            {/* If Doctor hasn't searched yet */}
            {userRole === "doctor" && searchQuery === "" && (
                <div className="text-center py-10 text-gray-400 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    Enter a patient's email above to access their secured medical history.
                </div>
            )}

            {/* If searched but no results */}
            {userRole === "doctor" && searchQuery !== "" && displayedRecords.length === 0 && (
                <div className="text-center py-8 text-red-500">
                    No records found for "{searchQuery}".
                </div>
            )}

            {/* Display Logic */}
            {(userRole === "patient" || (userRole === "doctor" && searchQuery !== "")) && (
                displayedRecords.map((rec) => (
                <div key={rec.id || rec._id} className="bg-white p-5 rounded-lg shadow border-l-4 border-indigo-500 hover:shadow-lg transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-lg text-indigo-900">{rec.diagnosis}</h4>
                            <p className="text-gray-700 mt-1"><strong>Rx:</strong> {rec.prescription}</p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wide">
                            {rec.hospital || "Secured"}
                        </span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500 flex justify-between items-center">
                        <span>Patient: {rec.patient_email}</span>
                        <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Transfer Controls (Only for Doctor) */}
                    {userRole === "doctor" && (
                        <TransferControl recordId={rec.id || rec._id} />
                    )}
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;