import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'

function App() {
  const [link, setLink] = useState("")

  function handleSubmit(e){
    e.preventDefault()


  }

  return (
    <>
    <h1>Add songs to your spotify playlist!</h1>
    <form onSubmit={handleSubmit}>
      <label htmlFor="spotifylink">Spotify Link To the Song:</label><br/>
      <input type='text' id='spotifylink' onChange={(e) => setLink(e.target.value)}></input><br/>
      <input type='submit' id='spotifylink'></input><br/>
    </form>
    <h2>{link}</h2>
    </>
  )
}

export default App
