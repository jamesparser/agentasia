/**
 * Encrypted WebSocket wrapper for E2E encrypted Yjs sync.
 *
 * Creates a WebSocket-compatible class that transparently encrypts
 * outgoing messages and decrypts incoming messages using AES-GCM.
 * Designed to be passed to y-websocket's `WebSocketPolyfill` option.
 *
 * The wrapper:
 * - Encrypts all `send()` calls before passing to the real WebSocket.
 * - Decrypts all incoming `onmessage` events before forwarding.
 * - Preserves message ordering via async queues.
 * - Silently drops messages that fail decryption (from unencrypted or
 *   differently-encrypted peers).
 *
 * @module
 */

import { encryptUpdate, decryptUpdate } from './crypto'

/**
 * Every frame on the wire is `[kind][encrypted payload]`. The relay cannot read
 * the payload, but it has to know which frames are worth keeping for a device
 * that joins later. `kind` is the only thing it learns:
 *
 *   1 = durable: a Yjs sync step 2 or update (the document's actual content)
 *   0 = ephemeral: awareness, awareness queries and sync step 1 requests
 *
 * Storing step 1 requests would make every replay trigger a storm of answers,
 * and awareness is only meaningful live, so the relay keeps kind 1 only.
 */
export const FRAME_EPHEMERAL = 0
export const FRAME_DURABLE = 1

/** y-websocket message type 0 = sync; its sub type 1 = step 2, 2 = update. */
export function frameKind(message: Uint8Array): number {
  return message.length >= 2 && message[0] === 0 && (message[1] === 1 || message[1] === 2)
    ? FRAME_DURABLE
    : FRAME_EPHEMERAL
}

/**
 * Creates a WebSocket-compatible class with E2E encryption baked in.
 *
 * The returned class captures the encryption key via closure so that
 * every instance created from it (including reconnections) uses the
 * same key.
 *
 * @param encryptionKey - AES-GCM CryptoKey from {@link deriveEncryptionKey}.
 * @returns A class that can be passed to y-websocket's `WebSocketPolyfill`.
 *
 * @example
 * ```ts
 * const key = await deriveEncryptionKey(password, roomId)
 * const EncryptedWS = createEncryptedWebSocketClass(key)
 * const provider = new WebsocketProvider(url, room, doc, {
 *   WebSocketPolyfill: EncryptedWS as unknown as typeof WebSocket,
 * })
 * ```
 */
export function createEncryptedWebSocketClass(encryptionKey: CryptoKey) {
  return class EncryptedWebSocket {
    /** The underlying real WebSocket connection. */
    private ws: WebSocket

    // Intercepted event handlers — we decrypt before forwarding.
    private _onmessage: ((event: MessageEvent) => void) | null = null
    private _onclose: ((event: CloseEvent) => void) | null = null
    private _onopen: ((event: Event) => void) | null = null
    private _onerror: ((event: Event) => void) | null = null

    /**
     * Serialises outgoing `send()` calls so that messages are encrypted
     * and dispatched in the same order they were submitted.
     */
    private sendQueue: Promise<void> = Promise.resolve()

    /**
     * Serialises incoming messages so that the `onmessage` handler
     * always receives them in arrival order after decryption.
     */
    private receiveQueue: Promise<void> = Promise.resolve()

    // WebSocket readyState constants (required by the interface).
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3
    readonly CONNECTING = 0
    readonly OPEN = 1
    readonly CLOSING = 2
    readonly CLOSED = 3

    constructor(url: string | URL, protocols?: string | string[]) {
      this.ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url)
      this.ws.binaryType = 'arraybuffer'

      // Intercept incoming messages: decrypt then forward.
      this.ws.onmessage = (event: MessageEvent) => {
        this.receiveQueue = this.receiveQueue.then(async () => {
          if (!this._onmessage) return
          try {
            const data = new Uint8Array(event.data as ArrayBuffer)
            // Drop the leading kind byte; the rest is the encrypted payload.
            const decrypted = await decryptUpdate(data.subarray(1), encryptionKey)
            // Construct a synthetic MessageEvent with the decrypted payload.
            const syntheticEvent = new MessageEvent('message', {
              data: decrypted.buffer,
            })
            this._onmessage(syntheticEvent)
          } catch {
            // Silently drop messages that fail decryption.
            // This happens when an unencrypted peer accidentally shares
            // the same derived room, or if data is corrupted in transit.
            console.warn('[E2E] Dropped undecryptable message')
          }
        })
      }

      // Forward lifecycle events directly.
      this.ws.onclose = (event: CloseEvent) => this._onclose?.(event)
      this.ws.onopen = (event: Event) => this._onopen?.(event)
      this.ws.onerror = (event: Event) => this._onerror?.(event)
    }

    // -----------------------------------------------------------------------
    // Property-based event handlers (used by y-websocket)
    // -----------------------------------------------------------------------

    set binaryType(value: BinaryType) {
      this.ws.binaryType = value
    }
    get binaryType(): BinaryType {
      return this.ws.binaryType
    }

    set onmessage(handler: ((event: MessageEvent) => void) | null) {
      this._onmessage = handler
    }
    get onmessage() {
      return this._onmessage
    }

    set onclose(handler: ((event: CloseEvent) => void) | null) {
      this._onclose = handler
    }
    get onclose() {
      return this._onclose
    }

    set onopen(handler: ((event: Event) => void) | null) {
      this._onopen = handler
    }
    get onopen() {
      return this._onopen
    }

    set onerror(handler: ((event: Event) => void) | null) {
      this._onerror = handler
    }
    get onerror() {
      return this._onerror
    }

    // -----------------------------------------------------------------------
    // Read-only properties forwarded to the inner WebSocket
    // -----------------------------------------------------------------------

    get readyState(): number {
      return this.ws.readyState
    }
    get url(): string {
      return this.ws.url
    }
    get protocol(): string {
      return this.ws.protocol
    }
    get bufferedAmount(): number {
      return this.ws.bufferedAmount
    }
    get extensions(): string {
      return this.ws.extensions
    }

    // -----------------------------------------------------------------------
    // Methods
    // -----------------------------------------------------------------------

    /**
     * Encrypt and send data through the WebSocket.
     *
     * Encryption is asynchronous but a serial queue guarantees messages
     * arrive at the server in the same order `send()` was called.
     */
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
      let uint8: Uint8Array
      if (data instanceof Uint8Array) {
        uint8 = data
      } else if (data instanceof ArrayBuffer) {
        uint8 = new Uint8Array(data)
      } else if (ArrayBuffer.isView(data)) {
        uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      } else {
        // String or Blob — not expected from y-websocket but handle gracefully.
        console.warn('[E2E] Non-binary send() — forwarding unencrypted')
        this.ws.send(data)
        return
      }

      this.sendQueue = this.sendQueue.then(async () => {
        try {
          const encrypted = await encryptUpdate(uint8, encryptionKey)
          const frame = new Uint8Array(1 + encrypted.length)
          frame[0] = frameKind(uint8)
          frame.set(encrypted, 1)
          this.ws.send(frame)
        } catch (err) {
          console.error('[E2E] Encryption failed, message not sent:', err)
        }
      })
    }

    /**
     * Close the underlying WebSocket connection.
     */
    close(code?: number, reason?: string): void {
      this.ws.close(code, reason)
    }

    /** Disconnect the underlying WebSocket (used by y-websocket). */
    disconnect(): void {
      this.close()
    }
  }
}
