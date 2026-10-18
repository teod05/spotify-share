import Login from "./Login"
import Layout from "./Layout"
import SpotifyConnect from "./SpotifyConnect"
import { useState } from "react"

function App() {
  const [user, setUser] = useState(null)
  const [showSpotifyConnect, setShowSpotifyConnect] = useState(false)
  
  function handleLogin(userData) {
    setUser(userData)
    if (!userData.spotifyConnected) {
      setShowSpotifyConnect(true)
    }
  }
  
  if (!user) {
    return <Login onLogin={handleLogin}/>
  }

  if (showSpotifyConnect) {
    return <SpotifyConnect onContinue={() => setShowSpotifyConnect(false)} />
  }

  return <Layout user={user} onLogout={() => setUser(null)} />
}

export default App
