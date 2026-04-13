import React from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'

import { App } from './App.jsx'
import './index.css'

createRoot(document.getElementById('app')).render(<App />)
