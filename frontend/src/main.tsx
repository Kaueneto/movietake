import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/AuthContext.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // mostra cache imediatamente, revalida em background após 30s
      staleTime: 30_000,
      // mantem dados no cache por 5 minutos mesmo sem componentes usando
      gcTime: 5 * 60_000,
      // nao recarrega ao focar a janela em mobile (evita flash)
      refetchOnWindowFocus: false,
      // tenta novamente 1x em caso de erro de rede
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
