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
