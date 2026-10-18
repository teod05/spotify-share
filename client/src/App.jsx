import Login from "./Login"
import Layout from "./Layout"
import { useState } from "react"

function App() {
  const [user, setUser] = useState(null)
  
  if (!user) {
    return <Login onLogin={() => setUser(true)}/>
  }

  return <Layout onLogout={() => setUser(null)} />
}

export default App
