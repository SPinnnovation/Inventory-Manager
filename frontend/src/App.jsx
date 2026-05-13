import React from 'react'
import { NotificationProvider } from './context/NotificationContext'
import { AuthProvider } from './context/AuthContext'
import AppRouter from './routers/AppRouter'
import Toast from './components/common/Toast/Toast'


const App = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppRouter />
        <Toast />
      </AuthProvider>
    </NotificationProvider>
  )
}

export default App