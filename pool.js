/**
 * Provider-neutral multi-key pool for SenseNova.
 * Runtime state is keyed by logical slot id; raw API keys never enter state.
 */
export class KeyPool {
  constructor({ slots, resolveKey, now = () => Date.now() }) {
    this.slots = slots
    this.resolveKey = resolveKey
    this.now = now
    this.state = new Map()
    this.cursor = 0
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

  disable(id) {
    const state = this.state.get(id)
    if (!state) return
    state.disabled = true
    state.cooldownUntil = 0
  }

  cooldown(id, delayMs) {
    const state = this.state.get(id)
    if (!state || state.disabled) return
    const delay = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 1
    state.cooldownUntil = Math.max(state.cooldownUntil, this.now() + delay)
  }

  clearCooldown(id) {
    const state = this.state.get(id)
    if (state && !state.disabled) state.cooldownUntil = 0
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

  async acquire({ exclude = new Set() } = {}) {
    const slots = this._snapshotSlots()
    if (slots.length === 0) return undefined
    const now = this.now()
    for (let offset = 0; offset < slots.length; offset += 1) {
      const index = (this.cursor + offset) % slots.length
      const slot = slots[index]
      if (exclude.has(slot.id)) continue
      const state = this.state.get(slot.id)
      if (!state || state.disabled || state.cooldownUntil > now) continue
      const key = await this.resolveKey(slot)
      if (typeof key !== 'string' || key.length === 0) continue
      this.cursor = (index + 1) % slots.length
      return { slot, key }
    }
    return undefined
  }
}
