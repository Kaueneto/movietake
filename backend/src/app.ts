import express from 'express'
import cors from 'cors'
import pesquisaRoutes from './routes/pesquisa.routes'
import midiaRoutes from './routes/midia.routes'
import preferenciasRoutes from './routes/preferencias.routes'

const app = express()

app.use(cors({
  origin: (origin, callback) => {
    // Permite: sem origin (apps mobile/curl), localhost, e domínios Vercel
    const allowed = !origin
      || origin.includes('localhost')
      || origin.includes('vercel.app')
      || origin === process.env.FRONTEND_URL
    callback(null, allowed)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rotas
app.use('/api/pesquisa', pesquisaRoutes)
app.use('/api', midiaRoutes)
app.use('/api', preferenciasRoutes)

export default app
