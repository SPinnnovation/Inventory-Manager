import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { NotificationProvider } from './context/NotificationContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>    
  </StrictMode>,
)
