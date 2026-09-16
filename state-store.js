/**
 * Durable runtime state for the SenseNova key pool.
 *
 * Only derived runtime facts are stored — a slot id and when it may be tried
 * again. Raw API keys never reach this file; they stay in DSH Credentials.
 *
 * Writes are debounced and atomic (temp file + rename) because the write path
 * runs on a 429/401 fast path: a partially written file would be worse than a
 * stale one. Reads are synchronous and total — a missing, unreadable, or
 * damaged file reads as empty state, so a corrupt file can never stop the
 * provider from starting.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const FORMAT_VERSION = 1
const STATE_DIR = 'llm-sensenova'
const STATE_FILE = 'key-state.json'
const DEFAULT_DEBOUNCE_MS = 1_000

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveInt(value) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/**
 * Resolve the default state file: `$DSH_HOME/storages/llm-sensenova/key-state.json`,
 * falling back to `~/.dsh` when the environment does not set a home.
 * @param env - Environment to read `DSH_HOME` from.
 * @returns Absolute path of the state file.
 */
export function defaultStateFilePath(env = process.env) {
  const home = typeof env?.DSH_HOME === 'string' && env.DSH_HOME.trim()
    ? env.DSH_HOME.trim()
    : join(homedir(), '.dsh')
  return join(home, 'storages', STATE_DIR, STATE_FILE)
}

/**
 * Normalize one stored record, dropping anything unusable.
 * @returns A clean record, or `undefined` when nothing should be restored.
 */
function normalizeRecord(value) {
  if (!isRecord(value)) return undefined
  const disabled = value.disabled === true
  const cooldownUntil = positiveInt(value.cooldownUntil)
  if (!disabled && cooldownUntil === 0) return undefined
  return { disabled, disabledAt: positiveInt(value.disabledAt), cooldownUntil }
}

/**
 * Reads and writes the key-pool runtime snapshot. An instance with no path is a
 * disabled store: it loads nothing and saves nothing, which is how the provider
 * degrades when persistence is switched off.
 */
export class RuntimeStateStore {
  /**
   * @param options - Store configuration.
   * @param options.filePath - State file path; empty disables persistence.
   * @param options.logger - Optional Cordis logger for warnings.
   * @param options.debounceMs - Write debounce window.
   */
  constructor({ filePath = '', logger, debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
    this.filePath = typeof filePath === 'string' ? filePath.trim() : ''
    this.logger = logger
    this.debounceMs = Number.isFinite(debounceMs) && debounceMs >= 0 ? Math.floor(debounceMs) : DEFAULT_DEBOUNCE_MS
    this.timer = undefined
    this.pending = undefined
    this.closed = false
  }

  get enabled() {
    return this.filePath.length > 0
  }

  /**
   * Read the persisted snapshot. Never throws.
   * @returns Slot id to stored runtime record.
   */
  load() {
    if (!this.enabled) return {}
    let text
    try {
      text = readFileSync(this.filePath, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') this._warn(`could not read runtime state: ${error?.message ?? error}`)
      return {}
    }
    const out = {}
    try {
      const parsed = JSON.parse(text)
      if (!isRecord(parsed) || parsed.version !== FORMAT_VERSION) return {}
      const keys = isRecord(parsed.keys) ? parsed.keys : {}
      for (const [id, value] of Object.entries(keys)) {
        if (!id) continue
        const record = normalizeRecord(value)
        if (record) out[id] = record
      }
    } catch (error) {
      this._warn(`ignoring damaged runtime state: ${error?.message ?? error}`)
      return {}
    }
    return out
  }

  /**
   * Queue the snapshot for a debounced atomic write. Never throws.
   * @param state - Snapshot from the pool.
   */
  save(state) {
    if (!this.enabled || this.closed) return
    this.pending = state
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.flush()
    }, this.debounceMs)
    this.timer?.unref?.()
  }

  /**
   * Write any pending snapshot now. Safe to call repeatedly and when nothing is
   * pending. Never throws.
   */
  flush() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    if (!this.enabled) return
    const state = this.pending
    this.pending = undefined
    if (state === undefined) return
    const tmp = `${this.filePath}.tmp`
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      writeFileSync(tmp, `${JSON.stringify({ version: FORMAT_VERSION, keys: state }, null, 2)}\n`, 'utf8')
      renameSync(tmp, this.filePath)
    } catch (error) {
      this._warn(`could not persist runtime state: ${error?.message ?? error}`)
    }
  }

  /** Flush pending work and stop accepting writes. */
  close() {
    this.flush()
    this.closed = true
  }

  _warn(message) {
    if (this.logger?.warn) this.logger.warn(`llm-sensenova: ${message}`)
  }
}
