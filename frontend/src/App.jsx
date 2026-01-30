import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [message, setMessage] = useState("Connecting...")

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/')
      .then(res => setMessage(res.data.status))
      .catch(err => setMessage("Error: Is Backend running?"))
  }, [])

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Hospital Management System</h1>
      <p>Status: <strong>{message}</strong></p>
    </div>
  )
}

export default App
