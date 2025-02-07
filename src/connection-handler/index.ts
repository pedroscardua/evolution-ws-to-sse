import { StoredSession } from './interfaces'
import { io, Socket } from 'socket.io-client'
import { SocketListeners } from './socket-listeners'
import { convertToDispatchedEvent } from './dispatched-event'
import { debug, error, info, warn } from '../logging/log'
import { activeConnections, activeSessions, messagesSent, sendErrors } from '../logging/metrics'
import { RETRY_INTERVAL, RETRY_LIMIT } from '../constants'

class ConnectionHandler {
  #createdSessions: StoredSession[] = []
  #createdSocketConnections = new Map<string, Socket>()

  // ensures we're connected to the socket and, if we aren't, connects to it
  // ensureConnection (id: string, url: string = 'bot.appfollow.com.br'): Promise<boolean> {
  //   if (this.#createdSocketConnections.has(id)) {
  //     return Promise.resolve(true)
  //   }

  //   return this.#connectToSocket(id, url)
  // }

  ensureConnection(id: string, url: string = 'bot.appfollow.com.br',session_id: string): Promise<boolean> {
    const existingSocket = this.#createdSocketConnections.get(id);
  
    if (existingSocket && existingSocket.connected) {
      return Promise.resolve(true); // Valida Conexão existente
    }
  
    if (existingSocket) {
      this.deleteSocketConnection(id); // Remove conexões antigas
    }
  
    return this.#connectToSocket(id, url);
  }

  // appendSession (session: StoredSession) {
  //   this.#createdSessions.push(session)
  // }

  appendSession (session: StoredSession) {
    const exists = this.#createdSessions.some(
      (s) => s.id === session.id && s.session_id === session.session_id
    );
  
    if (!exists) {
      this.#createdSessions.push(session);
      activeConnections.inc({ id: session.id, session_id: session.session_id });
    } else {
      warn(`connection-handler`, `Session already exists for id ${session.id} and session_id ${session.session_id}`);
    }
  }

  deleteSocketConnection (id: string) {
    const socket = this.#createdSocketConnections.get(id)
    if (socket) {
      socket.disconnect()
      this.#createdSocketConnections.delete(id)
    }

    const sessions = this.#getAllSessionsForId(id)
    sessions.forEach((store) => {
      this.deleteSession(store)
    })

    activeSessions.dec()
  }

  deleteSession (store: StoredSession) {
    try {
      store.session.push({ type: 'close' })
      store.response.status(200).set('Connection', 'close').end()
    } catch {}
  
    this.#createdSessions.splice(this.#createdSessions.indexOf(store), 1)
    activeConnections.dec({ id: store.id, session_id: store.session_id })
  }

  /// connects to the socket
  #connectToSocket (id: string, url: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const socket = io(`wss://${this.#sanitizeUrl(url)}/${id}`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity
      })

      const r = await SocketListeners.registerAndWaitConnection(id, socket, (data) => {
        this.#handleIncomingEvent(id, data)
      }, () => this.deleteSocketConnection(id))

      if (r) {
        this.#createdSocketConnections.set(id, socket)
      }

      resolve(r)
    })
  }

  /// normalizes the URL to ensure it's in the correct format
  #sanitizeUrl (url: string) {
    return url.replace('http://', '').replace('https://', '').replace(/\/$/, '')
  }

  /// handles incoming events from a socket connection
  #handleIncomingEvent (id: string, data: any) {
    const normalized = convertToDispatchedEvent(data)
    this.#broadcastEvents(id, normalized)
  }

  // #broadcastEvents (id: string, data: any) {
  //   const sessions = this.#getAllSessionsForId(id)
  //   info(`connection-handler.${id}`, `broadcasting event to ${sessions.length} sessions`)
  //   let disconnectedIdxs: number[] = []

  //   sessions.forEach((store, index) => {
  //     if (store.session.isConnected === false) {
  //       this.deleteSession(store)
  //       disconnectedIdxs.push(index)
  //       return
  //     }

  //     try {
  //       store.session.push(data)
  //       messagesSent.inc({ id })
  //     } catch (e) {
  //       console.error(e)
  //       error(`connection-handler.${id}`, `failed to send event to session ${index}; retrying`)
  //       sendErrors.inc({ id })
  //       this.#retrySendEvent(store, data).then((r) => {
  //         if (!r) {
  //           return this.deleteSession(store)
  //         }

  //         debug(`connection-handler.${id}`, `session ${index} has been recovered`)
  //       })
  //     }
  //   })

  //   if (disconnectedIdxs.length > 0) warn('connection-handler', `deleted ${disconnectedIdxs.length} disconnected sessions`)
  // }

  #broadcastEvents(id: string, data: any) {
    const sessions = this.#getAllSessionsForId(id);
    info(`connection-handler.${id}`, `broadcasting event to ${sessions.length} sessions`);
  
    const disconnectedSessions: StoredSession[] = [];
  
    sessions.forEach((store) => {
      if (!store.session.isConnected) {
        disconnectedSessions.push(store);
        return;
      }
  
      try {
        store.session.push(data);
        messagesSent.inc({ id });
      } catch (e) {
        console.error(e);
        sendErrors.inc({ id });
        disconnectedSessions.push(store);
      }
    });
  
    // Remove sessões desconectadas
    disconnectedSessions.forEach((store) => this.deleteSession(store));
  
    if (disconnectedSessions.length > 0) {
      warn('connection-handler', `Deleted ${disconnectedSessions.length} disconnected sessions`);
    }
  }
  

  async #retrySendEvent (store: StoredSession, data: any, retries = 0) {
    if (retries >= RETRY_LIMIT) {
      return Promise.resolve(false)
    }

    try {
      await new Promise((res) => setTimeout(res, RETRY_INTERVAL))
      store.session.push(data)
      messagesSent.inc({ id: store.id })
      return Promise.resolve(true)
    } catch (e) {
      console.error(e)
      error(`connection-handler.${store.id}`, `failed to send event to session; retrying (${RETRY_LIMIT - retries} attempts left)`)
      sendErrors.inc({ id: store.id })
      return this.#retrySendEvent(store, data, retries + 1)
    }
  }

  #getAllSessionsForId (id: string) {
    return this.#createdSessions.filter((s) => s.id === id)
  }
}

export default new ConnectionHandler()
