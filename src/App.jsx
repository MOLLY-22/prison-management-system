import { useState } from 'react'
import Login from './pages/Login'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [currentPath, setCurrentPath] = useState('/')

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  return (
    <>
      <Login />
    </>
  )
}

export default App
