import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MeshProvider } from '@meshsdk/react'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MeshProvider>
      <App />
    </MeshProvider>
  </StrictMode>,
)