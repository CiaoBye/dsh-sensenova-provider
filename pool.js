/**
 * Multi-key runtime pool for SenseNova.
 * Runtime state is keyed by logical slot id; raw API keys never enter state.
 *
 * State is optionally seeded from a persisted snapshot and reported back on
 * every change, so a cooldown or a 401 disable survives a DSH restart instead
 * of making the next request re-discover a key that is already known bad. The
 * pool itself stays storage-agnostic: it takes an initial snapshot and emits
 * snapshots, and the caller owns persistence.
 */

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveInt(value) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export class KeyPool {
  /**
   * @param options - Pool wiring.
   * @param options.slots - Supplies the configured key slots.
   * @param options.resolveKey - Resolves a slot to its secret.
   * @param options.now - Clock.
   * @param options.initialState - Persisted snapshot to seed from.
   * @param options.onStateChange - Called with a fresh snapshot after every mutation.
   * @param options.disabledTtlMs - How long a restored 401 disable stays in force; `<= 0` means until reset. May be a getter so the value follows live configuration.
   */
  constructor({ slots, resolveKey, now = () => Date.now(), initialState, onStateChange, disabledTtlMs = 0 } = {}) {
    this.slots = slots
    this.resolveKey = resolveKey
    this.now = now
    this.state = new Map()
    this.cursor = 0
    this.lastUsedId = ''
    this.initialState = isRecord(initialState) ? initialState : undefined
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : undefined
    this.disabledTtlMs = disabledTtlMs
    this.persistence = 'memory'
  }

  _emptyState() {
    return { disabled: false, disabledAt: 0, cooldownUntil: 0 }
  }

  /** Resolve the disable TTL, which may be supplied as a live-configuration getter. */
  _ttl() {
    const raw = typeof this.disabledTtlMs === 'function' ? this.disabledTtlMs() : this.disabledTtlMs
    return Number.isFinite(raw) ? Math.floor(raw) : 0
  }

  /**
   * Seed one slot's state from the persisted snapshot, dropping anything that
   * has already expired. An expired 401 disable is deliberately forgotten: the
   * credential may have been replaced in the meantime, and locking a key out
   * forever is worse than retrying it once.
   */
  _restore(id) {
    const state = this._emptyState()
    const raw = this.initialState?.[id]
    if (!isRecord(raw)) return state
    const now = this.now()
    state.cooldownUntil = Number.isFinite(raw.cooldownUntil) && raw.cooldownUntil > now ? Math.floor(raw.cooldownUntil) : 0
    if (raw.disabled === true) {
      const at = positiveInt(raw.disabledAt)
      const ttl = this._ttl()
      const expired = ttl > 0 && (at === 0 || now - at > ttl)
      if (!expired) {
        state.disabled = true
        state.disabledAt = at
      }
    }
    return state
  }

  _snapshotSlots() {
    const raw = this.slots()
    const seen = new Set()
    const slots = []
    for (const item of raw) {
      if (!item || typeof item.id !== 'string' || item.id.length === 0) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      slots.push(item)
      if (!this.state.has(item.id)) this.state.set(item.id, this._restore(item.id))
    }
    for (const id of [...this.state.keys()]) {
      if (!seen.has(id)) this.state.delete(id)
    }
    if (this.lastUsedId && !seen.has(this.lastUsedId)) this.lastUsedId = ''
    if (slots.length === 0) this.cursor = 0
    else this.cursor %= slots.length
    return slots
  }

  /**
   * Snapshot the persistable state: only slots carrying a live disable or
   * cooldown appear, so a healthy pool persists as an empty document.
   * @returns Slot id to `{ disabled, disabledAt, cooldownUntil }`.
   */
  snapshotState() {
    const out = {}
    for (const [id, state] of this.state) {
      if (!state.disabled && state.cooldownUntil === 0) continue
      out[id] = { disabled: state.disabled, disabledAt: state.disabledAt ?? 0, cooldownUntil: state.cooldownUntil }
    }
    return out
  }

  _notify() {
    if (!this.onStateChange) return
    try {
      this.onStateChange(this.snapshotState())
    } catch {}
  }

  status() {
    const now = this.now()
    return this._snapshotSlots().map((slot) => {
      const state = this.state.get(slot.id) ?? this._emptyState()
      return {
        id: slot.id,
        label: slot.label ?? slot.id,
        disabled: state.disabled,
        cooldownUntil: state.cooldownUntil,
        cooling: !state.disabled && state.cooldownUntil > now,
      }
    })
  }

  async runtimeStatus() {
    const now = this.now()
    const keys = []
    for (const slot of this._snapshotSlots()) {
      const state = this.state.get(slot.id) ?? this._emptyState()
      let configured = false
      try {
        const key = await this.resolveKey(slot)
        configured = typeof key === 'string' && key.length > 0
      } catch {}
      const cooling = !state.disabled && state.cooldownUntil > now
      keys.push({
        id: slot.id,
        label: slot.label ?? slot.id,
        configured,
        disabled: state.disabled,
        cooling,
        cooldownUntil: state.cooldownUntil,
        status: !configured ? 'missing' : state.disabled ? 'disabled' : cooling ? 'cooldown' : 'usable',
      })
    }
    return { now, lastUsedId: this.lastUsedId, persistence: this.persistence, keys }
  }

  disable(id) {
    this._snapshotSlots()
    const state = this.state.get(id)
    if (!state) return
    state.disabled = true
    state.disabledAt = this.now()
    state.cooldownUntil = 0
    this._notify()
  }

  cooldown(id, delayMs) {
    this._snapshotSlots()
    const state = this.state.get(id)
    if (!state || state.disabled) return
    const delay = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 1
    state.cooldownUntil = Math.max(state.cooldownUntil, this.now() + delay)
    this._notify()
  }

  clearCooldown(id) {
    this._snapshotSlots()
    const state = this.state.get(id)
    if (!state || state.disabled) return
    if (state.cooldownUntil === 0) return
    state.cooldownUntil = 0
    this._notify()
  }

  reset(id) {
    this._snapshotSlots()
    if (id === '*') {
      let changed = false
      for (const state of this.state.values()) {
        if (state.disabled || state.cooldownUntil !== 0) changed = true
        state.disabled = false
        state.disabledAt = 0
        state.cooldownUntil = 0
      }
      if (changed) this._notify()
      return
    }
    const state = this.state.get(id)
    if (!state) return
    if (!state.disabled && state.cooldownUntil === 0) return
    state.disabled = false
    state.disabledAt = 0
    state.cooldownUntil = 0
    this._notify()
  }

  earliestCooldownMs(exclude = new Set()) {
    const now = this.now()
    let best
    for (const slot of this._snapshotSlots()) {
      if (exclude.has(slot.id)) continue
      const state = this.state.get(slot.id)
      if (!state || state.disabled || state.cooldownUntil <= now) continue
      const delay = state.cooldownUntil - now
      best = best === undefined ? delay : Math.min(best, delay)
    }
    return best
  }

  async _trySlot(slot, index, exclude, now) {
    if (!slot || exclude.has(slot.id)) return undefined
    const state = this.state.get(slot.id)
    if (!state || state.disabled || state.cooldownUntil > now) return undefined
    const key = await this.resolveKey(slot)
    if (typeof key !== 'string' || key.length === 0) return undefined
    this.cursor = index + 1
    this.lastUsedId = slot.id
    return { slot, key }
  }

  async acquire({ exclude = new Set(), preferredId } = {}) {
    const slots = this._snapshotSlots()
    if (slots.length === 0) return undefined
    const now = this.now()

    if (typeof preferredId === 'string' && preferredId) {
      const index = slots.findIndex((slot) => slot.id === preferredId)
      if (index >= 0) {
        const selected = await this._trySlot(slots[index], index, exclude, now)
        if (selected) return selected
      }
    }

    for (let offset = 0; offset < slots.length; offset += 1) {
      const index = (this.cursor + offset) % slots.length
      const selected = await this._trySlot(slots[index], index, exclude, now)
      if (selected) return selected
    }
    return undefined
  }
}
