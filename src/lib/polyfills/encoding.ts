export type ConvertibleInput = string | Buffer | ArrayBuffer | Uint8Array | null | undefined

function toBuffer(input: ConvertibleInput): Buffer {
  if (Buffer.isBuffer(input)) {
    return input
  }

  if (input instanceof ArrayBuffer) {
    return Buffer.from(input)
  }

  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer)
  }

  if (typeof input === 'string') {
    return Buffer.from(input, 'utf8')
  }

  if (input == null) {
    return Buffer.from('')
  }

  return Buffer.from(String(input))
}

export function convert(
  input: ConvertibleInput,
  _from?: string,
  _to?: string
): Buffer {
  return toBuffer(input)
}

export default { convert }
