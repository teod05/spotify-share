function Login(){

    function handleSubmit(){
        e.preventDefault()
        const form = e.target
        const formData = new FormData(form)

    }
    return(
        <div>
            <h1>Please sign in</h1>
            <form onSubmit={handleSubmit}>
                <input
                    name="email"
                    placeholder="email"
                />
                <br/>
                <input
                    name="password"
                    placeholder="password"
                />
                <br/>
            </form>
            <button type="submit">Log in</button>
     
        </div>
    )
}

export default Login