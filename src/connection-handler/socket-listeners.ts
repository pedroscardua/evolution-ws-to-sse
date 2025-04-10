import { error, info, warn } from '../logging/log.ts'
import { activeSessions, messagesReceived, socketErrors } from '../logging/metrics.ts'
import { Socket } from 'socket.io-client'

export type EventHandlerFunction = (data: any) => void
export type ConnectionErrorHandler = (err: any) => void

export class SocketListeners {
  static onConnected (id: string) {
    info(`socket.${id}`, 'connected successfully')
    activeSessions.inc()
  }

  static onDisconnected (id: string) {
    warn(`socket.${id}`, 'disconnected')
    activeSessions.dec()
  }

  static onConnectionError (id: string, err: any) {
    error(`socket.${id}`, 'failed to connect! stack is below')
    console.error(err)
    socketErrors.inc({ id })
  }

  static onEvent (id: string, event: string) {
    info(`socket.${id}`, `received event: ${event}`)
    messagesReceived.inc({ id })
  }

  static registerAndWaitConnection (
    id: string,
    socket: Socket,
    handler: EventHandlerFunction = () => {},
    errorHandler: ConnectionErrorHandler = () => {}
  ) {
    return new Promise<boolean>((resolve) => {
      socket.onAny((event, ...args) => {
        this.onEvent(id, event)
        const data = args[0]
        if (data) {
          data.data.Servertype = event
        }
        handler(data)
      })

      socket.on('connect', () => {
        this.onConnected(id)
        resolve(true)
      })

      socket.on('disconnect', () => {
        this.onDisconnected(id)
      })

      socket.on('connect_error', (err) => {
        this.onConnectionError(id, err)
        socket.removeAllListeners()
        socket.disconnect()
        errorHandler(err)

        resolve(false)
      })
    })
  }
}