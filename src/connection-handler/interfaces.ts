import { Session } from 'better-sse'
import express from 'express'

export interface StoredSession {
  session: Session
  response: express.Response
  id: string
  session_id: string
}
