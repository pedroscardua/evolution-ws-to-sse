const reset = '\x1b[0m'
const greyColor = '\x1b[90m'
const italics = '\x1b[3m'
const green = '\x1b[32m'
export const bold = (str: string) => `\x1b[1m${str}${reset}`

const log = (level: string, asciiColor: string, scope: string, message: string) => {
  const date = new Date()
  // hh:mm:ss format
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  const thread = `${green}main`
  console.log(`${greyColor}${time}${reset} ${thread}${reset} ${asciiColor}[${bold(level)}${asciiColor}]${reset} (${italics}${scope}${reset}): ${message}`)
}

const pad = (str: number, length = 2) => {
  return '0'.repeat(length - str.toString().length) + str
}
export const info = (scope: string, message: string) => log('INFO', '\x1b[32m', scope, message)
export const warn = (scope: string, message: string) => log('WARN', '\x1b[33m', scope, message)
export const error = (scope: string, message: string) => log('ERROR', '\x1b[31m', scope, message)
export const debug = (scope: string, message: string) => log('DEBUG', '\x1b[36m', scope, message)
