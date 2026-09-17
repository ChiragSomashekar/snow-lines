import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Poster from './Poster.jsx'
import Method from './Method.jsx'

// the poster by default, the method page at ?method
const method = new URLSearchParams(window.location.search).has('method')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {method ? <Method /> : <Poster />}
  </StrictMode>,
)
