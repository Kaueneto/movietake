import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import { Feed } from './paginas/Feed'
import { Pesquisa } from './paginas/Pesquisa'
import { Assistindo } from './paginas/Assistindo'
import { Perfil } from './paginas/Perfil'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f0f13]">
        <Routes>
          <Route path="/"           element={<Feed />} />
          <Route path="/pesquisar"  element={<Pesquisa />} />
          <Route path="/assistindo" element={<Assistindo />} />
          <Route path="/perfil"     element={<Perfil />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App
