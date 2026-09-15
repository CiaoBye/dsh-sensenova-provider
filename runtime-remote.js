import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

const PACKAGE = '@ciaobye/dsh-sensenova-provider'
const SERVICE = 'senseNovaRuntime'
const NAMESPACE = 'sensenova'

function descriptor(method, parameters = []) {
  return {
    id: `${PACKAGE}#${NAMESPACE}/${method}`,
    service: SERVICE,
    namespace: NAMESPACE,
    method,
    invocation: { kind: 'direct' },
    parameters,
    result: { mode: 'src-json' },
  }
}

const RUNTIME_DESCRIPTOR = descriptor('runtime')
const MODELS_DESCRIPTOR = descriptor('models')
const RESET_DESCRIPTOR = descriptor('reset', [{
  name: 'id', wire: 'id', source: 'json', codec: { mode: 'src-json' },
}])

class SenseNovaRuntimeService extends TypertRemoteService {
  constructor(ctx, deps) {
    super(ctx, SERVICE, { namespace: NAMESPACE })
    this.deps = deps
  }

  async runtime() {
    return this.deps.pool.runtimeStatus()
  }

  async reset(id) {
    this.deps.pool.reset(typeof id === 'string' ? id : '*')
    return this.deps.pool.runtimeStatus()
  }

  async models() {
    const models = await this.deps.adapter.listAllModels('sensenova')
    return { models: models.map(({ id, name, contextWindow, maxTokens }) => ({ id, name, contextWindow, maxTokens })) }
  }
}

export function applyRuntimeRemote(ctx, deps) {
  ctx.inject(['typert'], (remoteCtx) => {
    new SenseNovaRuntimeService(remoteCtx, deps)
    const unregister = remoteCtx.typert.register({
      package: PACKAGE,
      face: 'host',
      schemas: [],
      model: { services: [], events: [], objects: [] },
      invocations: [RUNTIME_DESCRIPTOR, RESET_DESCRIPTOR, MODELS_DESCRIPTOR],
    })
    remoteCtx.effect(() => () => void unregister(), 'dsh-sensenova-provider: runtime remote')
  })
}
