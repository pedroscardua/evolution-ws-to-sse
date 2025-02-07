import { BUCKET_NAME } from '../constants'

export interface DispatchedEvent {
  id_msg: string
  fromMe: boolean
  remoteJid: string
  type: string
  conversation: string | null
  timestampz: string
  keyid: string
  mimetype: string | null
  instanceid: string
  bucketname: string
  mediaurl: string
}

const normalizeMimeType = (data: any): string | null => {
  if (data.message?.imageMessage) {
    return data.message.imageMessage.mimetype.split('/')[1]
  } else if (data.message?.audioMessage) {
    return data.message.audioMessage.mimetype
      .split('/')[1]
      .split(';')[0]
      .replace('ogg', 'oga')
  } else if (data.message?.videoMessage) {
    return data.message.videoMessage.mimetype
      .split('/')[1]
      .replace('quicktime', 'qt')
  } else {
    return null
  }
}

const normalizedMediaURL = (data: any): string => {
  return data.data.message.mediaUrl ||
    `https://s3.servidor1.appfollow.com.br/${
      data.server_url.includes('bot2.')
        ? 'evolutionv20102'
        : data.server_url.includes('bot.')
        ? 'evolutionv201'
        : data.server_url
    }/evolution-api/${data.data.instanceId}/${data.data.key.remoteJid}/${data.data.messageType}/${data.data.key.id}.${
      data.data.message.imageMessage?.mimetype?.split('/')[1] ||
      data.data.message.audioMessage?.mimetype
        ?.split('/')[1]
        ?.split(';')[0]
        .replace('ogg', 'oga') ||
      data.data.message.videoMessage?.mimetype
        ?.split('/')[1]
        ?.replace('quicktime', 'qt')
    }`
}

export const convertToDispatchedEvent = (data: any): DispatchedEvent => {
  // Aqui, você usa a função normalizedMediaURL e armazena o resultado em uma variável.
  const mediaurl = normalizedMediaURL(data)

  return {
    id_msg: data.data.id,
    fromMe: data.data.key.fromMe,
    remoteJid: data.data.key.remoteJid,
    type: data.data.messageType,
    conversation: data.data.message?.conversation || null,
    timestampz: new Date(data.data.messageTimestamp * 1000).toISOString(),
    keyid: data.data.key.id,
    instanceid: data.data.instanceId,
    mimetype: normalizeMimeType(data.data),
    bucketname: BUCKET_NAME,
    mediaurl: mediaurl // ou, diretamente: mediaurl: normalizedMediaURL(data)
  }
}
