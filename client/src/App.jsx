import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'

function App() {

  function handleSubmit(e){
    e.preventDefault()
    const form = e.target
    // puts form data into formData object (js)
    const formData = new FormData(form)

    // we are using a proxy server to avoid CORS
    fetch('/api/add', {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ link: formData.get("spotifyLink"), description: formData.get("description")})
    } )

  }

  return (
    <>
    <form onSubmit={handleSubmit}>
      <label>
        Paste your link: <input name="spotifyLink" />
      </label>
      <br/>
      <label>
        Why did you choose thing song? <input name="description" />
      </label>
      <br/>
      <button type="submit">Submit form</button>
    </form>
    </>
  )
}

export default App
