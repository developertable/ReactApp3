// src/main.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Application entry point. Mounts the root <App /> component into the
// #root element from index.html.
//
// StrictMode is a React development tool that intentionally runs effects
// twice in dev to help catch bugs from impure components. It does NOT run
// in production builds.
// ─────────────────────────────────────────────────────────────────────────────

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)