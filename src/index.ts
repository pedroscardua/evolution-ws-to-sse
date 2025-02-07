import { createSession } from 'better-sse'
import express from 'express'
import cors from 'cors'
import { activeConnections, connections, registry } from './logging/metrics'
import connectionHandler from './connection-handler'
import { error, info, warn } from './logging/log.ts'

const app = express()
app.use(cors())

// @ts-expect-error
app.get('/sse', async (req: express.Request, res: express.Response) => {
  const number = req.query.id as string
  const url = req.query.url as string
  const session_id = req.query.session_id as string
  if (!number || !session_id) return res.status(400).send('missing query params')

  if (!number.startsWith('instance_')) {
    warn(`sse.${number}`, 'possible invalid instance id')
  }

  const connected = await connectionHandler.ensureConnection(number, url, session_id).catch((e) => {
    error(`sse.${number}`, 'failed to connect to socket. stack is below')
    console.error(e)
    return false
  })

  if (!connected) {
    return res.status(500).send('failed to connect').set('Connection', 'close').end()
  }

  const session = await createSession(req, res)
  connections.inc()
  activeConnections.inc({ id: number })
  connectionHandler.appendSession({
    session,
    id: number,
    response: res,
    session_id
  })
})

app.get('/metrics', async (_, res) => {
  res.set('Content-Type', registry.contentType)
  res.end(await registry.metrics())
})

app.listen(3000, () => {
  info('server', 'listening on port 3000')
})