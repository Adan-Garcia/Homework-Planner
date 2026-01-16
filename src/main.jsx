//
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { EventProvider, UIProvider } from './context/PlannerContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EventProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </EventProvider>
  </StrictMode>,
)