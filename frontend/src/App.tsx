import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import { Feed } from './paginas/Feed'
import { Pesquisa } from './paginas/Pesquisa'
import { Assistindo } from './paginas/Assistindo'
import { Perfil } from './paginas/Perfil'
import { DetalhesFilme } from './paginas/DetalhesFilme'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f0f13]">
        <Routes>
          <Route path="/"              element={<Feed />} />
          <Route path="/pesquisar"     element={<Pesquisa />} />
          <Route path="/assistindo"    element={<Assistindo />} />
          <Route path="/perfil"        element={<Perfil />} />
          <Route path="/filmes/:id"    element={<DetalhesFilme />} />
        </Routes>
        {/* o bottomnav não aparece na tela de detalhes */}
        <BottomNavCondicional />
      </div>
    </BrowserRouter>
  )
}

import { useLocation } from 'react-router-dom'

function BottomNavCondicional() {
  const { pathname } = useLocation()
  const esconder = pathname.startsWith('/filmes/') || pathname.startsWith('/series/')
  if (esconder) return null
  return <BottomNav />
}

export default App
