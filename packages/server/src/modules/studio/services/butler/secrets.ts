const SECRET_KEY = /^(password|passwd|pwd|secret|token|jdbc|jdbcurl|jdbc_url|connectionstring|connection_string|dsn|privatekey|private_key|apikey|api_key|credential|credentials|url)$/i

const SECRET_VALUE = /(?:password|passwd|pwd)\s*[:=]\s*(?!\[redacted\](?![A-Za-z0-9]))\S+|jdbc:[^\s]+|[a-z][a-z0-9+.-]*:\/\/(?!\[redacted\]@)[^\s/@:]+:[^\s/@]+@/i

export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key.trim())
}

export function hasSecretMaterial(value: string): boolean {
  return SECRET_VALUE.test(value)
}

export function redactSecrets(text: string): string {
  return text
    .replace(/((?:password|passwd|pwd)\s*[:=]\s*)(\S+)/gi, '$1[redacted]')
    .replace(/jdbc:[^\s]+/gi, '[redacted-connection]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[redacted]@')
}

export function assertNoSecretMaterial(value: unknown): void {
  const text = JSON.stringify(value)
  if (text && hasSecretMaterial(text)) {
    throw new Error('Butler context failed the secret check')
  }
}
