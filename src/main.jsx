import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import { RootLayout } from './components'
import { RootProvider } from './context/RootContext'
import PrivacyPage from './pages/PrivacyPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootProvider>
      <BrowserRouter>
        <RootLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/explore" replace />} />
            <Route path="/explore" element={<App />} />
            <Route path="/detail" element={<App />} />
            <Route path="/setting" element={<App />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/explore" replace />} />
          </Routes>
        </RootLayout>
      </BrowserRouter>
    </RootProvider>
  </React.StrictMode>,
)
