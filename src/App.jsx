import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Teams from './pages/Teams'
import Rankings from './pages/Rankings'
import Stage from './pages/Stage'
import Live from './pages/Live'
import Strafwiel from './pages/Strafwiel'
import Admin from './pages/Admin'

function AppContent() {
  const { pathname } = useLocation()
  const isLive = pathname === '/live'

  return (
    <>
      {!isLive && <Navbar />}
      <div className={isLive ? '' : 'pb-20 md:pb-0'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/stage/:nummer" element={<Stage />} />
          <Route path="/live" element={<Live />} />
          <Route path="/strafwiel" element={<Strafwiel />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  )
}
