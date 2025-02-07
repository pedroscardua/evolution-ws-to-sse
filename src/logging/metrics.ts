import { Registry, Counter, Gauge, collectDefaultMetrics } from 'prom-client'

export const registry = new Registry()
registry.setDefaultLabels({
  app: process.env.APP_NAME || 'main'
})

collectDefaultMetrics({ register: registry })

// how many times a client has connected to the server
export const connections = new Counter({
  name: 'wts_all_connections',
  help: 'Total number of connections to the server',
  registers: [registry]
})

// all active connections (bucketed by id)
export const activeConnections = new Gauge({
  name: 'wts_active_connections',
  help: 'Number of active connections',
  registers: [registry],
  labelNames: ['id', 'session_id']
})

// all active sessions
export const activeSessions = new Gauge({
  name: 'wts_active_sessions',
  help: 'Number of active sessions',
  registers: [registry]
})

// sending errors that have occurred (bucketed by id)
export const sendErrors = new Counter({
  name: 'wts_send_errors',
  help: 'Number of send errors that have occurred',
  labelNames: ['id'],
  registers: [registry]
})

// socket errors that have occurred (bucketed by id)
export const socketErrors = new Counter({
  name: 'wts_socket_errors',
  help: 'Number of socket errors that have occurred and resulted in a disconnect + connect errors',
  labelNames: ['id', 'session_id'],
  registers: [registry]
})

// messages sent (bucketed by id)
export const messagesSent = new Counter({
  name: 'wts_messages_sent',
  help: 'Number of messages sent',
  labelNames: ['id', 'session_id'],
  registers: [registry]
})

// messages received (bucketed by id)
export const messagesReceived = new Counter({
  name: 'wts_messages_received',
  help: 'Number of messages received',
  labelNames: ['id', 'session_id'],
  registers: [registry]
})