import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import Login from '../../who-am-i/Login'
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
      <h1>Prison Management System</h1>
    </>
  )
}

export default App
