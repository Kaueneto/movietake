import express from 'express'
import cors from 'cors'
import pesquisaRoutes from './routes/pesquisa.routes'
import midiaRoutes from './routes/midia.routes'

const app = express()

app.use(cors({
  origin: true, // em dev aceita qualquer origem
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}))

app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rotas
app.use('/api/pesquisa', pesquisaRoutes)
app.use('/api', midiaRoutes)

export default app
