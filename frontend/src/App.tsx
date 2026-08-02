import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import { Feed } from './paginas/Feed'
import { Pesquisa } from './paginas/Pesquisa'
import { Assistindo } from './paginas/Assistindo'
import { Perfil } from './paginas/Perfil'
import { DetalhesFilme } from './paginas/DetalhesFilme'
import { DetalhesSerie } from './paginas/DetalhesSerie'
import { Auth } from './paginas/Auth'
import { useAuth } from './lib/AuthContext'
import { Loader2 } from 'lucide-react'

function App() {
  const { session, loading } = useAuth()

  // aguarda verificar se há sessão ativa
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
        <Loader2 size={28} className="animate-spin text-[#6366f1]" aria-label="Carregando" />
      </div>
    )
  }

  // s nao tem sessao vai pra  tela de autenticação
  if (!session) {
    return <Auth />
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f0f13]">
        <Routes>
          <Route path="/"           element={<Feed />} />
          <Route path="/pesquisar"  element={<Pesquisa />} />
          <Route path="/assistindo" element={<Assistindo />} />
          <Route path="/perfil"     element={<Perfil />} />
          <Route path="/filmes/:id" element={<DetalhesFilme />} />
          <Route path="/series/:id" element={<DetalhesSerie />} />
        </Routes>
        <BottomNavCondicional />
      </div>
    </BrowserRouter>
  )
}

function BottomNavCondicional() {
  const { pathname } = useLocation()
  const esconder = pathname.startsWith('/filmes/') || pathname.startsWith('/series/')
  if (esconder) return null
  return <BottomNav />
}

export default App
