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
  
  // Doctor Input State
  const [patientEmail, setPatientEmail] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState(""); 
  const [department, setDepartment] = useState(""); // Can be auto-filled by AI if you have that enabled

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
      
      // Load data based on role
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

  // --- 🛡️ GOVERNMENT VIEW ---
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

  // --- 🏥 DOCTOR / PATIENT VIEW ---
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-blue-700">🏥 Hospital Dashboard</h2>
            <p className="text-gray-500">Welcome, {fullName} ({userRole})</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">Logout</button>
        </div>

        {/* Create Record Form (Doctors Only) */}
        {userRole === "doctor" && (
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📝 New Medical Record</h3>
            <form onSubmit={handleCreateRecord} className="flex flex-col gap-4">
              <input 
                type="email" 
                placeholder="Patient Email" 
                value={patientEmail} 
                onChange={(e) => setPatientEmail(e.target.value)} 
                required 
                className="p-3 border rounded focus:ring-2 focus:ring-green-500 outline-none"
              />
              <input 
                type="text" 
                placeholder="Diagnosis" 
                value={diagnosis} 
                onChange={(e) => setDiagnosis(e.target.value)} 
                required 
                className="p-3 border rounded focus:ring-2 focus:ring-green-500 outline-none"
              />
              <textarea 
                placeholder="Prescription" 
                value={prescription} 
                onChange={(e) => setPrescription(e.target.value)} 
                required 
                className="p-3 border rounded h-24 focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button type="submit" className="bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition">
                Save Record
              </button>
            </form>
          </div>
        )}

        {/* Record List */}
        <div>
          <h3 className="text-xl font-bold text-gray-700 mb-4 pb-2 border-b">
            {userRole === "doctor" ? "📂 Records Created by You" : "📂 My Medical History"}
          </h3>

          <div className="space-y-4">
            {records.map((rec) => (
              <div key={rec.id || rec._id} className="bg-white p-5 rounded-lg shadow border border-gray-200 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-lg text-blue-800">{rec.diagnosis}</h4>
                        <p className="text-gray-600 mt-1"><strong>Rx:</strong> {rec.prescription}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {rec.hospital || "Secured"}
                    </span>
                </div>
                
                <div className="mt-3 text-sm text-gray-400">
                  Patient: {rec.patient_email} | {new Date(rec.created_at).toLocaleDateString()}
                </div>

                {/* 👇 The Critical Transfer Component */}
                {userRole === "doctor" && (
                    <TransferControl recordId={rec.id || rec._id} />
                )}
              </div>
            ))}
            
            {records.length === 0 && (
                <p className="text-gray-500 italic text-center py-8">No records found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;