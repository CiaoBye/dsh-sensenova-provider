/**
 * Multi-key runtime pool for SenseNova.
 * Runtime state is keyed by logical slot id; raw API keys never enter state.
 */
export class KeyPool {
  constructor({ slots, resolveKey, now = () => Date.now() }) {
    this.slots = slots
    this.resolveKey = resolveKey
    this.now = now
    this.state = new Map()
    this.cursor = 0
    this.lastUsedId = ''
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
      if (!this.state.has(item.id)) this.state.set(item.id, { disabled: false, cooldownUntil: 0 })
    }
    for (const id of [...this.state.keys()]) {
      if (!seen.has(id)) this.state.delete(id)
    }
    if (this.lastUsedId && !seen.has(this.lastUsedId)) this.lastUsedId = ''
    if (slots.length === 0) this.cursor = 0
    else this.cursor %= slots.length
    return slots
  }

  status() {
    const now = this.now()
    return this._snapshotSlots().map((slot) => {
      const state = this.state.get(slot.id) ?? { disabled: false, cooldownUntil: 0 }
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
      const state = this.state.get(slot.id) ?? { disabled: false, cooldownUntil: 0 }
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
    return { now, lastUsedId: this.lastUsedId, keys }
  }

  disable(id) {
    this._snapshotSlots()
    const state = this.state.get(id)
    if (!state) return
    state.disabled = true
    state.cooldownUntil = 0
  }

  cooldown(id, delayMs) {
    this._snapshotSlots()
    const state = this.state.get(id)
    if (!state || state.disabled) return
    const delay = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 1
    state.cooldownUntil = Math.max(state.cooldownUntil, this.now() + delay)
  }

  clearCooldown(id) {
    this._snapshotSlots()
    const state = this.state.get(id)
    if (state && !state.disabled) state.cooldownUntil = 0
  }

  reset(id) {
    this._snapshotSlots()
    if (id === '*') {
      for (const state of this.state.values()) {
        state.disabled = false
        state.cooldownUntil = 0
      }
      return
    }
    const state = this.state.get(id)
    if (!state) return
    state.disabled = false
    state.cooldownUntil = 0
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
