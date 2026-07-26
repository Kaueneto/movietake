import app from './app'
import { env } from './config/env'

app.listen(env.port, '0.0.0.0', () => {
  console.log(`backend rodando em http://0.0.0.0:${env.port}`)
  console.log(`   acesso local:  http://localhost:${env.port}`)
  console.log(`   aacesso na rede: http://<seu-ip>:${env.port}`)
})
