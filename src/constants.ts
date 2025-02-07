/// How many times ws_to_sse may retry sending an event before giving up?
export const RETRY_LIMIT = parseInt(process.env.RETRY_LIMIT || '2')
export const RETRY_INTERVAL = parseInt(process.env.RETRY_INTERVAL || '5000')
export const BUCKET_NAME = process.env.BUCKET_NAME || 'evolutionv201'