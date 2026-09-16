/** Resolve the preferred SenseNova key for one model request. */
export function preferredKeyForModel(connection, model) {
  const keys = new Set((connection?.keys ?? []).map((entry) => entry.id))
  for (const rule of connection?.modelKeyRules ?? []) {
    if (!Array.isArray(rule?.models) || !rule.models.includes(model)) continue
    if (typeof rule.keyId === 'string' && keys.has(rule.keyId)) return rule.keyId
  }
  return typeof connection?.activeKey === 'string' && keys.has(connection.activeKey)
    ? connection.activeKey
    : undefined
}

/** Whether a catalog model should be visible in normal DSH model pickers. */
export function modelIsVisible(connection, model) {
  const visible = Array.isArray(connection?.visibleModels) ? connection.visibleModels : []
  return visible.length === 0 || visible.includes(model)
}

/**
 * Slot ids whose credential reference is the one that just changed.
 *
 * A committed credential write means the stored secret is no longer the one we
 * refused: a 401 disable recorded against the old value must not outlive it, or
 * a freshly pasted key looks broken too.
 * @param keys - Configured key slots.
 * @param ref - The changed credential reference.
 * @returns Ids of every slot bound to that reference.
 */
export function slotsForCredentialRef(keys, ref) {
  const name = String(ref ?? '')
  if (!name) return []
  return (keys ?? [])
    .filter(entry => entry && entry.apiKeyEnv === name && typeof entry.id === 'string' && entry.id)
    .map(entry => entry.id)
}
