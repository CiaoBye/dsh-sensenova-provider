// Client half of dsh-account-pool.
// Hand-written browser bundle in the lazy-CJS format the client module loader
// expects: it only REGISTERS the factory; the body runs at materialization.
// It mounts the accountPool Remote, registers one settings.section sidebar
// entry, and renders a provider-aware usage dashboard for the three supported
// routes. Each provider owns an independent key list and failover state.

window.__ModuleLoader__.load({
  id: 'dsh-account-pool',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');

    const NS = 'settings.accountPool';
    const inject = ['slots', 'locale', 'remote'];
    const PROVIDER_IDS = ['opencode-go', 'opencode', 'openrouter'];

    const zh = {
      nav: '多 Provider 账号池',
      title: '多 Provider 账号池',
      subtitle: 'OpenCode Go · OpenCode Zen · OpenRouter 独立 Key 池与自动切换',
      providerOpenCodeGo: 'OpenCode Go',
      providerOpenCode: 'OpenCode Zen',
      providerOpenRouter: 'OpenRouter',
      providerGoHint: '5 小时 / 每周 / 每月窗口额度',
      providerZenHint: '官方模型目录 · 当前无公开用量接口',
      providerRouterHint: '账户余额 / 限额与模型目录',
      loading: '查询中…',
      loadFailed: '加载失败',
      paused: '连续失败，已暂停自动刷新',
      refresh: '刷新',
      refreshModels: '刷新模型目录',
      takeoverServing: '服务中 · 路由 {route} 已接管',
      takeoverOwnRoute: '自有路由模式 · {route}',
      takeoverWaiting: '等待接管',
      takeoverWaitingHint: '{route} 路由当前由其他插件持有。释放该供应商路由后，本插件会自动接管，历史会话无需任何改动。',
      takeoverDisabled: 'Provider 池已停用',
      takeoverDisabledHint: '该 Provider 未启用接管；开启 enabled / takeover 后才会注册路由。',
      noKeysTitle: '尚未配置 Key',
      noKeysHint: '每个 Key 对应一个供应商账号。在下方「Key 管理」中添加，Key 值请通过凭据填写（设置 → 模型的凭据页，或 ~/.dsh/.credentials.yaml / 环境变量）。',
      activeBadge: '使用中',
      idleBadge: '空闲',
      exhaustedBadge: '额度耗尽',
      invalidBadge: '已失效',
      disabledBadge: '已停用',
      rolling: '5 小时滚动',
      weekly: '每周',
      monthly: '每月',
      credits: '账户额度',
      creditsDetail: '已用 {used} · 剩余 {left}',
      usageUnsupported: '该供应商当前没有公开用量接口，仅在请求失败时切换 Key。',
      used: '已用',
      left: '剩余',
      resetsIn: '重置',
      credentialRef: '凭据引用',
      noApiKey: '未配置凭据，等待填写',
      unauthorized: 'Key 无效或已过期（401）',
      network: '网络请求失败',
      badJson: '接口响应解析失败',
      httpError: '接口返回 HTTP {status}',
      unknown: '未知',
      switchNow: '立即切换',
      disable: '停用',
      enable: '启用',
      clearInvalid: '清除失效',
      lastSwitch: '最近切换',
      switchQuota: '额度耗尽',
      switchConsecutive: '连续失败',
      switchInvalid: '凭据失效',
      switchManual: '手动',
      manageTitle: 'Key 管理',
      manageHint: 'id 自动生成；label 为显示名；密钥直接粘贴（留空则不修改）；凭据引用名留空会自动生成。',
      addKey: '添加 Key',
      remove: '删除',
      save: '保存',
      discard: '放弃修改',
      saved: '已保存',
      saveFailed: '保存失败',
      labelPlaceholder: '显示名，如 主号',
      envPlaceholder: '引用名，留空自动生成（如 PROVIDER_KEY_A）',
      secretPlaceholder: '粘贴 API Key（留空则不修改）',
      envInvalidHint: '引用名不是密钥！密钥请粘贴到第三个「密钥」栏；引用名留空即可自动生成',
      strategyTitle: '切号策略',
      strategyHint: '避让：窗口用量或账户余额达到阈值即提前切走（100=仅失败时切）；连败：模型调用失败累计 N 次切号（0=关闭）。额度耗尽或凭据失效始终立即切换。',
      preemptLead: '用量/余额达到',
      preemptUnit: '% 自动避让',
      preemptUnsupported: '该 Provider 暂不支持用量预切换',
      consecLead: '连续失败',
      consecUnit: '次切号',
      refreshing: '刷新中…',
      updatedAt: '数据更新于',
      preemptLabel: '用量达到 % 自动切号（100=仅失败时切）',
      consecLabel: '连续失败次数达到后自动切号（0=关闭）',
      consecNote: '连败切号',
      existingRowTag: '已有',
      newRowTag: '新增',
      confirmRemoveExisting: '以下已有 Key 将从池中移除：',
      activeBanner: '当前使用',
      confirmSwitch: '立即切换到该 Key？',
      confirmDisable: '停用该 Key？停用后不再参与自动切换。',
      confirmRemove: '删除该 Key？其运行状态将一并清除。',
      confirmClear: '清除失效标记？请确认已在凭据中修复该 Key。',
      actionFailed: '操作失败',
      yes: '确定',
      cancel: '取消',
      perKey: '每 Key',
      preemptNote: '预切换阈值',
      preemptOff: '失败才切',
      modelTitle: '模型选择',
      modelHint: '控制哪些模型出现在对话的模型下拉里；未勾选的模型不可发起请求。「全部模型」始终跟随官方目录，新模型自动可用。',
      allModels: '全部模型（跟随官方目录）',
      modelCount: '已启用 {n} 个模型',
      modelNone: '未选择任何模型：该供应商暂时不可用',
      modelUnavailable: '模型目录暂不可用，稍后刷新重试',
      catalogError: '模型目录刷新失败',
      modelEmptyHint: '自定义选择至少需要勾选一个模型',
      modelSearch: '搜索模型名称或 ID',
      providerFilter: '提供商',
      allProviders: '全部提供商',
      capabilityFilter: '能力',
      allCapabilities: '全部能力',
      sortBy: '排序',
      sortName: '名称',
      sortProvider: '提供商',
      sortCost: '输入价格',
      sortContext: '上下文长度',
      selectionMode: '选择模式',
      allMode: '跟随全部模型',
      customMode: '自定义选择',
      selectionCount: '已选 {selected} / {total}',
      filteredCount: '当前结果 {n} 个',
      selectAllFiltered: '全选当前结果',
      clearFiltered: '取消当前结果',
      keepFiltered: '只保留当前结果',
      clearSelection: '清空选择',
      expandAll: '全部展开',
      collapseAll: '全部折叠',
      onlyThis: '仅保留此模型',
      noFilteredModels: '没有匹配的模型',
      staleSelection: '另有 {n} 个已选模型已不在当前目录',
      modelGroupCount: '{label} · {n}',
      modelPrice: '输入 {input} / 输出 {output} 每百万 Token',
      modelContext: '上下文 {n}',
      modelNoPrice: '价格未知',
      tagVision: '视觉',
      tagAudio: '音频',
      tagVideo: '视频',
      tagReasoning: '推理',
      tagCoding: '编程',
      tagFree: '免费',
      tagLatest: 'Latest',
      tagPreview: '预览',
      tagFast: '快速',
      tagInstruct: '指令',
      tagAlias: '别名',
    };
    const en = {
      nav: 'Multi-provider account pool',
      title: 'Multi-provider account pool',
      subtitle: 'Independent key pools and automatic failover for OpenCode Go, Zen, and OpenRouter',
      providerOpenCodeGo: 'OpenCode Go',
      providerOpenCode: 'OpenCode Zen',
      providerOpenRouter: 'OpenRouter',
      providerGoHint: '5h / weekly / monthly usage windows',
      providerZenHint: 'official model catalog · usage endpoint unavailable',
      providerRouterHint: 'account credits / limits and model catalog',
      loading: 'Loading…',
      loadFailed: 'Failed to load',
      paused: 'repeated failures, auto-refresh paused',
      refresh: 'Refresh',
      refreshModels: 'Refresh models',
      takeoverServing: 'Serving · {route} route taken over',
      takeoverOwnRoute: 'Own route mode · {route}',
      takeoverWaiting: 'Waiting for takeover',
      takeoverWaitingHint: 'The {route} route is currently owned by another plugin. Release that provider route and this plugin takes over automatically — existing conversations keep working unchanged.',
      takeoverDisabled: 'Provider pool disabled',
      takeoverDisabledHint: 'This Provider is not enabled for takeover. Enable enabled / takeover before it can register its route.',
      noKeysTitle: 'No keys configured',
      noKeysHint: 'Each key is one provider account. Add keys under “Key management” below; paste the literal key into the credentials page (Settings → Models, or ~/.dsh/.credentials.yaml / environment variables).',
      activeBadge: 'in use',
      idleBadge: 'idle',
      exhaustedBadge: 'quota exhausted',
      invalidBadge: 'invalid',
      disabledBadge: 'disabled',
      rolling: '5h rolling',
      weekly: 'Weekly',
      monthly: 'Monthly',
      credits: 'Account credits',
      creditsDetail: '{used} used · {left} remaining',
      usageUnsupported: 'This provider has no public usage endpoint yet; failover happens on request failures.',
      used: 'used',
      left: 'left',
      resetsIn: 'resets',
      credentialRef: 'credential ref',
      noApiKey: 'credential not set yet',
      unauthorized: 'key rejected (401)',
      network: 'network request failed',
      badJson: 'bad JSON from the usage endpoint',
      httpError: 'usage endpoint answered HTTP {status}',
      unknown: 'unknown',
      switchNow: 'Switch now',
      disable: 'Disable',
      enable: 'Enable',
      clearInvalid: 'Clear invalid',
      lastSwitch: 'last switch',
      switchQuota: 'quota',
      switchConsecutive: 'consecutive failures',
      switchInvalid: 'credential',
      switchManual: 'manual',
      manageTitle: 'Key management',
      manageHint: 'id is auto-generated; label is the display name; paste the secret directly (empty = keep); the credential ref auto-generates when left empty.',
      addKey: 'Add key',
      remove: 'Remove',
      save: 'Save',
      discard: 'Discard',
      saved: 'Saved',
      saveFailed: 'Save failed',
      labelPlaceholder: 'display name, e.g. main',
      envPlaceholder: 'ref name, auto when empty (e.g. PROVIDER_KEY_A)',
      secretPlaceholder: 'paste the API key (empty = keep)',
      envInvalidHint: 'the ref name is not the secret! Paste the secret into the third field, or leave the ref name empty to auto-generate',
      strategyTitle: 'Switching strategy',
      strategyHint: 'Avoid: switch ahead once usage or account balance reaches the threshold (100=fail-only). Consecutive: switch after N accumulated call failures (0=off). Quota exhaustion or an invalid credential always switches immediately.',
      preemptLead: 'Auto-avoid at',
      preemptUnit: '% usage / balance',
      preemptUnsupported: 'Usage preemption is unavailable for this provider',
      consecLead: 'switch after',
      consecUnit: 'consecutive failures',
      refreshing: 'Refreshing…',
      updatedAt: 'updated',
      preemptLabel: 'Auto-switch at usage % (100=fail-only)',
      consecLabel: 'Switch after N consecutive failures (0=off)',
      consecNote: 'consec. failures',
      existingRowTag: 'existing',
      newRowTag: 'new',
      confirmRemoveExisting: 'These existing keys will be removed from the pool:',
      activeBanner: 'in use',
      confirmSwitch: 'Switch to this key now?',
      confirmDisable: 'Disable this key? It stops taking part in failover.',
      confirmRemove: 'Remove this key? Its runtime state is cleared too.',
      confirmClear: 'Clear the invalid mark? Make sure the credential is fixed first.',
      actionFailed: 'Action failed',
      yes: 'OK',
      cancel: 'Cancel',
      perKey: 'per key',
      preemptNote: 'preempt threshold',
      preemptOff: 'fail-only',
      modelTitle: 'Model selection',
      modelHint: 'Controls which models appear in the chat model dropdown; unchecked models cannot be used. “All models” always follows the official catalog — new models become available automatically.',
      allModels: 'All models (follow the catalog)',
      modelCount: '{n} models enabled',
      modelNone: 'No model selected: the provider is temporarily unusable',
      modelUnavailable: 'Model catalog unavailable — try refreshing later',
      catalogError: 'Model catalog refresh failed',
      modelEmptyHint: 'Custom selection needs at least one model',
      modelSearch: 'Search model name or ID',
      providerFilter: 'Provider',
      allProviders: 'All providers',
      capabilityFilter: 'Capability',
      allCapabilities: 'All capabilities',
      sortBy: 'Sort by',
      sortName: 'Name',
      sortProvider: 'Provider',
      sortCost: 'Input price',
      sortContext: 'Context window',
      selectionMode: 'Selection mode',
      allMode: 'Follow all models',
      customMode: 'Custom selection',
      selectionCount: '{selected} / {total} selected',
      filteredCount: '{n} results',
      selectAllFiltered: 'Select filtered',
      clearFiltered: 'Clear filtered',
      keepFiltered: 'Keep filtered only',
      clearSelection: 'Clear selection',
      expandAll: 'Expand all',
      collapseAll: 'Collapse all',
      onlyThis: 'Keep only this',
      noFilteredModels: 'No matching models',
      staleSelection: '{n} selected model(s) are no longer in the catalog',
      modelGroupCount: '{label} · {n}',
      modelPrice: 'Input {input} / output {output} per million tokens',
      modelContext: 'Context {n}',
      modelNoPrice: 'Price unavailable',
      tagVision: 'vision',
      tagAudio: 'audio',
      tagVideo: 'video',
      tagReasoning: 'reasoning',
      tagCoding: 'coding',
      tagFree: 'free',
      tagLatest: 'latest',
      tagPreview: 'preview',
      tagFast: 'fast',
      tagInstruct: 'instruct',
      tagAlias: 'alias',
    };

    // Client-side Remote contribution. The result codecs are pass-through
    // parsers: the Host validates business results against its own zod schemas
    // before they cross the wire; this side only needs the descriptor shapes
    // to mount and call.
    const passthrough = () => ({ parse(value) { return value; } });
    // NOTE: every result codec must be strict — the generated client Remote
    // binder rejects src-json results at mount time ("has no strict codec").
    const strict = () => ({ mode: 'strict', typeSymbol: 'json', schema: passthrough() });
    const DESCRIPTOR = (method, parameters) => ({
      id: `dsh-account-pool#accountPool/${method}`,
      service: 'accountPool',
      namespace: 'accountPool',
      method,
      invocation: { kind: 'direct' },
      parameters: parameters.map(p => ({ name: p, wire: p, source: 'json', codec: { mode: 'strict', typeSymbol: 'json', schema: passthrough() } })),
      result: strict(),
    });

    const TYPERT_REMOTE = {
      package: 'dsh-account-pool',
      descriptors: [
        DESCRIPTOR('status', []),
        DESCRIPTOR('setActive', ['provider', 'id']),
        DESCRIPTOR('setDisabled', ['provider', 'id', 'on']),
        DESCRIPTOR('clearInvalid', ['provider', 'id']),
        DESCRIPTOR('putKeys', ['provider', 'keys']),
        DESCRIPTOR('putKeySecret', ['provider', 'id', 'secret']),
        DESCRIPTOR('putConfig', ['provider', 'config']),
        DESCRIPTOR('takeOverState', ['provider']),
        DESCRIPTOR('refreshModels', ['provider']),
      ],
    };

    const PROVIDER_META = Object.freeze({
      'opencode-go': { labelKey: 'providerOpenCodeGo', hintKey: 'providerGoHint', envPrefix: 'OPENCODE_GO_KEY_' },
      opencode: { labelKey: 'providerOpenCode', hintKey: 'providerZenHint', envPrefix: 'OPENCODE_ZEN_KEY_' },
      openrouter: { labelKey: 'providerOpenRouter', hintKey: 'providerRouterHint', envPrefix: 'OPENROUTER_KEY_' },
    });

    function providerLabel(provider, t) {
      const meta = PROVIDER_META[provider];
      return meta ? t(meta.labelKey) : provider;
    }

    function providerHint(provider, t) {
      const meta = PROVIDER_META[provider];
      return meta ? t(meta.hintKey) : '';
    }

    function providerEnvPrefix(provider) {
      return PROVIDER_META[provider]?.envPrefix || 'ACCOUNT_POOL_KEY_';
    }

    const styles = {
      wrap: { maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' },
      providerTabs: { display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--dsw-alias-border-l2)', paddingBottom: 8 },
      providerTab: { flex: '1 1 150px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', font: 'inherit', cursor: 'pointer', background: 'transparent', borderRadius: 8, padding: '8px 10px', textAlign: 'left' },
      providerTabActive: { borderColor: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-3)' },
      providerHint: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.35 },
      title: { fontSize: 16, fontWeight: 600, margin: 0 },
      subtitle: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, margin: '2px 0 0' },
      hint: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 13, lineHeight: 1.6, margin: 0 },
      error: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 13, lineHeight: 1.6, margin: 0 },
      banner: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 },
      bannerWarn: { borderColor: 'var(--dsw-alias-state-warning-primary, #d97706)', color: 'var(--dsw-alias-label-primary)' },
      bannerOk: { borderColor: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary)' },
      card: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
      cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
      cardName: { fontSize: 14, fontWeight: 600, margin: 0 },
      cardMeta: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, margin: 0 },
      badges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
      barRow: { display: 'flex', flexDirection: 'column', gap: 3 },
      barHead: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--dsw-alias-label-secondary)', gap: 8 },
      barTrack: { height: 8, borderRadius: 4, background: 'var(--dsw-alias-bg-layer-1)', overflow: 'hidden' },
      barFill: { height: '100%', borderRadius: 4, background: 'var(--dsw-alias-state-business-primary)', transition: 'width .2s ease' },
      actions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 },
      button: { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', cursor: 'pointer', background: 'transparent', borderRadius: 6, padding: '5px 12px' },
      buttonPrimary: { border: '1px solid var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-state-business-primary)' },
      buttonDanger: { border: '1px solid var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)' },
      buttonDisabled: { opacity: 0.45, cursor: 'not-allowed' },
      row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
      input: { flex: '1 1 160px', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', borderRadius: 6, padding: '5px 10px', minWidth: 0 },
      editorRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
      editorId: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, minWidth: 110 },
      notice: { fontSize: 13, margin: 0 },
      noticeOk: { color: 'var(--dsw-alias-state-business-primary)' },
      noticeErr: { color: 'var(--dsw-alias-state-error-primary)' },
      badge: { fontSize: 11, borderRadius: 999, padding: '2px 9px', border: '1px solid transparent', whiteSpace: 'nowrap' },
      compactInput: { flex: '1 1 260px', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', borderRadius: 6, padding: '5px 10px', minWidth: 0 },
      compactSelect: { flex: '0 1 170px', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', borderRadius: 6, padding: '5px 8px', minWidth: 0 },
      modelToolbar: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
      modelList: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 620, overflowY: 'auto', paddingRight: 4 },
      modelGroup: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, overflow: 'hidden' },
      modelGroupHead: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, border: 0, color: 'var(--dsw-alias-label-primary)', font: 'inherit', cursor: 'pointer', background: 'var(--dsw-alias-bg-layer-1)', padding: '8px 10px', textAlign: 'left' },
      modelGroupBody: { display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 8px 8px' },
      modelItem: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '5px 4px', borderRadius: 6 },
      modelItemLabel: { display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', minWidth: 0, cursor: 'pointer' },
      modelItemInfo: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
      modelItemName: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      modelItemId: { opacity: 0.65, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      modelMeta: { display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
      modelMode: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
      modelModeButton: { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', cursor: 'pointer', background: 'transparent', borderRadius: 6, padding: '5px 10px' },
    };

    const BADGE_TONE = {
      active: { bg: 'var(--dsw-alias-state-business-primary)', color: '#fff', text: t => t('activeBadge') },
      idle: { bg: 'transparent', color: 'var(--dsw-alias-label-secondary)', border: 'var(--dsw-alias-border-l2)', text: t => t('idleBadge') },
      exhausted: { bg: 'transparent', color: '#d97706', border: '#d97706', text: t => t('exhaustedBadge') },
      invalid: { bg: 'transparent', color: 'var(--dsw-alias-state-error-primary)', border: 'var(--dsw-alias-state-error-primary)', text: t => t('invalidBadge') },
      disabled: { bg: 'transparent', color: 'var(--dsw-alias-label-tertiary)', border: 'var(--dsw-alias-border-l2)', text: t => t('disabledBadge') },
    };

    // The typert client Remote wraps every result in an `{ ok, value }`
    // envelope (ok:false carries `error.message`); unwrap or throw so the
    // UI only ever sees business values.
    function unwrapRemote(result) {
      if (result && result.ok === false) {
        throw new Error((result.error && result.error.message) || 'remote failed')
      }
      return result && result.value !== undefined ? result.value : result
    }

    function badgeFor(state, active, t) {
      const kind = active && state === 'healthy' ? 'active'
        : state === 'exhausted' ? 'exhausted'
          : state === 'invalid' ? 'invalid'
            : state === 'disabled' ? 'disabled'
              : 'idle';
      const tone = BADGE_TONE[kind];
      return React.createElement('span', {
        style: { ...styles.badge, background: tone.bg, color: tone.color, borderColor: tone.border },
      }, tone.text(t));
    }

    function fmtReset(resetsAt, t, tick) {
      if (!resetsAt) return t('unknown');
      const target = new Date(resetsAt).getTime();
      if (Number.isNaN(target)) return resetsAt;
      const diff = target - tick;
      if (diff <= 0) return t('unknown');
      const totalMin = Math.floor(diff / 60000);
      if (totalMin < 60 * 24) {
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
      return new Date(resetsAt).toLocaleString();
    }

    function barColor(percent) {
      if (percent === null) return 'var(--dsw-alias-state-business-primary)';
      if (percent >= 100) return 'var(--dsw-alias-state-error-primary)';
      if (percent >= 90) return '#d97706';
      return 'var(--dsw-alias-state-business-primary)';
    }

    // Original "GO" mark: a G arc-with-bar plus an O ring, drawn in the same
    // 1.5px outline stroke language as the settings icon set (currentColor).
    function GoMark(props) {
      const { size } = props;
      return React.createElement('svg', {
        width: size, height: size, viewBox: '0 0 34 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': 'true', style: { display: 'block' },
      },
        React.createElement('path', { d: 'M 7 2.75 A 5.25 5.25 0 1 1 9.625 3.453' }),
        React.createElement('path', { d: 'M 12.25 8 H 9.5' }),
        React.createElement('circle', { cx: 27, cy: 8, r: 5.25 }),
      );
    }

    function UsageBar(props) {
      const { name, windowData, t, tick } = props;
      const percent = windowData && typeof windowData.percent === 'number' ? windowData.percent : null;
      const pct = percent === null ? 0 : Math.max(0, Math.min(100, percent));
      const left = percent === null ? t('unknown') : `${Math.max(0, 100 - percent)}%`;
      const shown = percent === null ? t('unknown') : `${percent}%`;
      return React.createElement('div', { style: styles.barRow },
        React.createElement('div', { style: styles.barHead },
          React.createElement('span', null, `${name} · ${t('used')} ${shown} / ${t('left')} ${left}`),
          React.createElement('span', null, `${t('resetsIn')}: ${fmtReset(windowData && windowData.resetsAt, t, tick)}`),
        ),
        React.createElement('div', { style: styles.barTrack },
          React.createElement('div', { style: { ...styles.barFill, width: pct + '%', background: barColor(percent) } }),
        ),
      );
    }

    function CreditUsage(props) {
      const { usage, t, tick } = props;
      const credits = usage && usage.credits ? usage.credits : {};
      const remaining = typeof credits.limitRemaining === 'number'
        ? credits.limitRemaining.toFixed(2)
        : t('unknown');
      const spent = typeof credits.usage === 'number'
        ? credits.usage.toFixed(2)
        : t('unknown');
      return React.createElement(React.Fragment, null,
        React.createElement(UsageBar, {
          name: t('credits'),
          windowData: {
            percent: typeof usage.preemptPercent === 'number' ? usage.preemptPercent : null,
            resetsAt: credits.limitReset,
          },
          t, tick,
        }),
        React.createElement('p', { style: styles.cardMeta },
          t('creditsDetail').replace('{used}', spent).replace('{left}', remaining)),
      );
    }

    function usageErrorText(code, t) {
      if (code === 'no-api-key') return t('noApiKey');
      if (code === 'unsupported') return t('usageUnsupported');
      if (code === 'unauthorized') return t('unauthorized');
      if (code === 'network') return t('network');
      if (code === 'bad-json') return t('badJson');
      if (code && code.startsWith('http-')) return t('httpError').replace('{status}', code.slice(5));
      return t('unknown');
    }

    function KeyCard(props) {
      const { item, t, tick, busy, onAction } = props;
      const usage = item.usage || {};
      const disabled = busy !== null;
      const isActive = item.active && item.state === 'healthy';
      return React.createElement('div', { style: styles.card },
        React.createElement('div', { style: styles.cardHead },
          React.createElement('div', null,
            React.createElement('h3', { style: styles.cardName }, item.label),
            React.createElement('p', { style: styles.cardMeta }, `${t('credentialRef')}: ${item.apiKeyEnv}`),
          ),
          React.createElement('div', { style: styles.badges }, badgeFor(item.state, item.active, t)),
        ),
        item.usageError
          ? React.createElement('p', { style: styles.error }, usageErrorText(item.usageError, t))
          : item.usage && item.usage.kind === 'unsupported'
            ? React.createElement('p', { style: styles.hint }, t('usageUnsupported'))
            : item.usage && item.usage.kind === 'credits'
              ? React.createElement(CreditUsage, { usage: item.usage, t, tick })
          : React.createElement(React.Fragment, null,
            React.createElement(UsageBar, { name: t('rolling'), windowData: usage.rolling, t, tick }),
            React.createElement(UsageBar, { name: t('weekly'), windowData: usage.weekly, t, tick }),
            React.createElement(UsageBar, { name: t('monthly'), windowData: usage.monthly, t, tick }),
          ),
        React.createElement('div', { style: styles.actions },
          // Manual switch only makes sense on a usable key (healthy + not
          // already active). Disabled/exhausted/invalid keys would be
          // rejected by the host ("not usable right now").
          item.state === 'healthy' && !isActive
            ? React.createElement('button', {
              style: { ...styles.button, ...styles.buttonPrimary, ...(disabled ? styles.buttonDisabled : {}) },
              disabled,
              onClick: () => onAction('setActive', item.id, t('confirmSwitch')),
            }, t('switchNow'))
            : null,
          item.state === 'disabled'
            ? React.createElement('button', {
              style: { ...styles.button, ...(disabled ? styles.buttonDisabled : {}) },
              disabled,
              onClick: () => onAction('setDisabled', item.id, null, false),
            }, t('enable'))
            : React.createElement('button', {
              style: { ...styles.button, ...(disabled ? styles.buttonDisabled : {}) },
              disabled,
              onClick: () => onAction('setDisabled', item.id, t('confirmDisable'), true),
            }, t('disable')),
          item.state === 'invalid'
            ? React.createElement('button', {
              style: { ...styles.button, ...(disabled ? styles.buttonDisabled : {}) },
              disabled,
              onClick: () => onAction('clearInvalid', item.id, t('confirmClear')),
            }, t('clearInvalid'))
            : null,
        ),
      );
    }

    function Editor(props) {
      const { draft, setDraft, t, busy, onSave, existingKeys } = props;
      const existingIds = new Set((existingKeys || []).map(k => k.id));
      const update = (index, field, value) => {
        setDraft(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
      };
      const remove = (index) => {
        setDraft(prev => prev.filter((_, i) => i !== index));
      };
      const add = () => {
        setDraft(prev => [...prev, { id: 'key-' + Date.now().toString(36), label: '', apiKeyEnv: '', secret: '' }]);
      };
      const save = () => {
        const rows = draft.map(row => ({
          id: row.id,
          label: (row.label || '').trim(),
          apiKeyEnv: (row.apiKeyEnv || '').trim(),
          secret: (row.secret || '').trim(),
        }));
        for (const row of rows) {
          if (!row.label) { onSave(null, t('labelPlaceholder')); return; }
          // The secret belongs in its own field; a reference name must look
          // like an environment variable. An empty one auto-generates.
          if (row.apiKeyEnv && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.apiKeyEnv)) {
            onSave(null, t('envInvalidHint')); return;
          }
        }
        // Deleting an already-saved key is destructive; confirm before wiping.
        const draftIds = new Set(rows.map(r => r.id));
        const removed = (existingKeys || []).filter(k => !draftIds.has(k.id));
        if (removed.length > 0
            && typeof window !== 'undefined' && typeof window.confirm === 'function'
            && !window.confirm(`${t('confirmRemoveExisting')}\n${removed.map(k => k.label).join('、')}`)) {
          return;
        }
        onSave(rows);
      };
      return React.createElement('div', { style: styles.card },
        React.createElement('div', { style: styles.cardHead },
          React.createElement('div', null,
            React.createElement('h3', { style: styles.cardName }, t('manageTitle')),
            React.createElement('p', { style: styles.cardMeta }, t('manageHint')),
          ),
        ),
        draft.map((row, index) => React.createElement('div', { key: row.id, style: styles.editorRow },
          React.createElement('span', { style: styles.editorId },
            row.id,
            React.createElement('span', {
              style: { marginLeft: 6, opacity: 0.6, fontSize: 11 },
            }, existingIds.has(row.id) ? t('existingRowTag') : t('newRowTag')),
          ),
          React.createElement('input', {
            style: styles.input,
            placeholder: t('labelPlaceholder'),
            value: row.label,
            disabled: busy !== null,
            onChange: event => update(index, 'label', event.target.value),
          }),
          React.createElement('input', {
            style: styles.input,
            placeholder: t('envPlaceholder'),
            value: row.apiKeyEnv,
            disabled: busy !== null,
            onChange: event => update(index, 'apiKeyEnv', event.target.value),
          }),
          React.createElement('input', {
            style: styles.input,
            type: 'password',
            autoComplete: 'off',
            placeholder: t('secretPlaceholder'),
            value: row.secret,
            disabled: busy !== null,
            onChange: event => update(index, 'secret', event.target.value),
          }),
          React.createElement('button', {
            style: { ...styles.button, ...styles.buttonDanger, ...(busy !== null ? styles.buttonDisabled : {}) },
            disabled: busy !== null,
            onClick: () => remove(index),
          }, t('remove')),
        )),
        React.createElement('div', { style: styles.actions },
          React.createElement('button', { style: styles.button, disabled: busy !== null, onClick: add }, t('addKey')),
          React.createElement('button', {
            style: { ...styles.button, ...styles.buttonPrimary, ...(busy !== null ? styles.buttonDisabled : {}) },
            disabled: busy !== null,
            onClick: save,
          }, t('save')),
          React.createElement('button', {
            style: { ...styles.button, ...(busy !== null ? styles.buttonDisabled : {}) },
            disabled: busy !== null,
            onClick: () => setDraft(null),
          }, t('discard')),
        ),
      );
    }

    /** Switching-strategy form: the two configurable auto-switch rules. */
    function StrategyCard(props) {
      const { t, data, strategy, setStrategy, busy, onSave } = props;
      const preemptDisabled = data.canPreemptByUsage === false;
      const value = strategy !== null
        ? strategy
        : { preempt: String(data.preemptAtPercent ?? 100), consec: String(data.switchAfterConsecutiveFailures ?? 0) };
      const update = (field, raw) => {
        const next = { ...value, [field]: raw };
        setStrategy(next);
      };
      const save = () => {
        const preempt = Number(value.preempt);
        const consec = Number(value.consec);
        if (!Number.isFinite(preempt) || preempt < 0 || preempt > 100) { onSave(null, t('preemptLabel')); return; }
        if (!Number.isFinite(consec) || consec < 0 || consec > 20) { onSave(null, t('consecLabel')); return; }
        onSave({ preemptAtPercent: preempt, switchAfterConsecutiveFailures: consec });
      };
      const rowStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--dsw-alias-label-secondary)' };
      const smallInput = { width: 64, flex: 'none' };
      return React.createElement('div', { style: styles.card },
        React.createElement('div', { style: styles.cardHead },
          React.createElement('div', null,
            React.createElement('h3', { style: styles.cardName }, t('strategyTitle')),
            React.createElement('p', { style: styles.cardMeta }, t('strategyHint')),
          ),
        ),
        React.createElement('div', { style: rowStyle },
          React.createElement('span', null, t('preemptLead')),
          React.createElement('input', {
            style: { ...styles.input, ...smallInput },
            value: value.preempt,
            disabled: busy !== null || preemptDisabled,
            onChange: event => update('preempt', event.target.value),
          }),
          React.createElement('span', null, t('preemptUnit')),
          React.createElement('span', null, t('consecLead')),
          React.createElement('input', {
            style: { ...styles.input, ...smallInput },
            value: value.consec,
            disabled: busy !== null,
            onChange: event => update('consec', event.target.value),
          }),
          React.createElement('span', null, t('consecUnit')),
          preemptDisabled
            ? React.createElement('span', { style: styles.cardMeta }, t('preemptUnsupported'))
            : null,
          React.createElement('button', {
            style: { ...styles.button, ...styles.buttonPrimary, ...(busy !== null ? styles.buttonDisabled : {}) },
            disabled: busy !== null,
            onClick: save,
          }, t('save')),
        ),
      );
    }

    const MODEL_TAG_KEYS = Object.freeze({
      vision: 'tagVision',
      audio: 'tagAudio',
      video: 'tagVideo',
      reasoning: 'tagReasoning',
      coding: 'tagCoding',
      free: 'tagFree',
      latest: 'tagLatest',
      preview: 'tagPreview',
      fast: 'tagFast',
      instruct: 'tagInstruct',
      alias: 'tagAlias',
    });
    const MODEL_TAG_ORDER = ['vision', 'audio', 'video', 'reasoning', 'coding', 'free', 'latest', 'preview', 'fast', 'instruct', 'alias'];

    function modelGroup(model) {
      if (model && typeof model.providerGroup === 'string' && model.providerGroup.length > 0) return model.providerGroup;
      const id = String((model && model.id) || 'other');
      const slash = id.indexOf('/');
      return (slash > 0 ? id.slice(0, slash) : id).replace(/^~/, '') || 'other';
    }

    function modelGroupLabel(model) {
      if (model && typeof model.providerLabel === 'string' && model.providerLabel.length > 0) return model.providerLabel;
      return modelGroup(model)
        .split(/[-_]/g)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Other';
    }

    function modelTags(model) {
      if (Array.isArray(model && model.tags)) return [...new Set(model.tags)];
      const id = String((model && model.id) || '');
      const name = String((model && model.name) || '');
      const text = `${id} ${name}`.toLowerCase();
      const tags = [];
      const input = new Set(Array.isArray(model && model.input) ? model.input : []);
      if (input.has('image')) tags.push('vision');
      if (input.has('audio')) tags.push('audio');
      if (input.has('video')) tags.push('video');
      if ((model && model.reasoning) || /reasoning|thinking/.test(text)) tags.push('reasoning');
      if (/code|coder|coding|program|dev/.test(text)) tags.push('coding');
      if (/free/.test(text)
          || (model && model.cost && model.cost.input === 0 && model.cost.output === 0)) tags.push('free');
      if (/latest/.test(text)) tags.push('latest');
      if (/preview/.test(text)) tags.push('preview');
      if (/fast|flash/.test(text)) tags.push('fast');
      if (/instruct/.test(text)) tags.push('instruct');
      if (/^~|\bauto\b/.test(id)) tags.push('alias');
      return [...new Set(tags)];
    }

    function tagLabel(tag, t) {
      const key = MODEL_TAG_KEYS[tag];
      return key ? t(key) : tag;
    }

    function compactNumber(value) {
      if (!Number.isFinite(value)) return '';
      if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
      if (value >= 1000) return `${Math.round(value / 1000)}K`;
      return String(value);
    }

    function modelContextLabel(model, t) {
      return Number.isFinite(model && model.contextWindow)
        ? t('modelContext').replace('{n}', compactNumber(model.contextWindow))
        : null;
    }

    function priceNumber(value) {
      if (!Number.isFinite(value)) return null;
      if (value === 0) return '0';
      if (value < 0.01) return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
      if (value < 1) return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    }

    function modelPriceLabel(model, t) {
      const input = model && model.cost && priceNumber(model.cost.input);
      const output = model && model.cost && priceNumber(model.cost.output);
      if (input == null || output == null) return t('modelNoPrice');
      if (input === '0' && output === '0') return t('tagFree');
      return t('modelPrice').replace('{input}', `$${input}`).replace('{output}', `$${output}`);
    }

    function modelPriceShort(model, t) {
      const input = model && model.cost && priceNumber(model.cost.input);
      const output = model && model.cost && priceNumber(model.cost.output);
      if (input == null || output == null) return null;
      if (input === '0' && output === '0') return t('tagFree');
      return `$${input}/$${output}`;
    }

    function modelSortCost(model) {
      return Number.isFinite(model && model.cost && model.cost.input) ? model.cost.input : Number.POSITIVE_INFINITY;
    }

    /**
     * Model selection UI. The persisted contract remains modelMode/models, but
     * the UI keeps selection and discovery separate: custom mode supports
     * individual checkboxes, filtered batch operations, and one-click-only
     * selection; catalog metadata drives provider groups and capability tags.
     */
    function ModelCard(props) {
      const { t, data, sel, setSel, busy, onSave } = props;
      const available = Array.isArray(data && data.availableModels) ? data.availableModels : [];
      const [query, setQuery] = React.useState('');
      const [providerFilter, setProviderFilter] = React.useState('all');
      const [tagFilter, setTagFilter] = React.useState('all');
      const [sortBy, setSortBy] = React.useState('provider');
      const [collapsedGroups, setCollapsedGroups] = React.useState(() => new Set());
      const value = sel !== null
        ? sel
        : {
          mode: (data && data.modelMode) || 'all',
          ids: Array.isArray(data && data.configuredModels)
            ? [...data.configuredModels]
            : available.filter(m => m.enabled).map(m => m.id),
        };
      const normalized = React.useMemo(() => available.map(model => ({
        ...model,
        providerGroup: modelGroup(model),
        providerLabel: modelGroupLabel(model),
        tags: modelTags(model),
      })), [available]);
      const providerOptions = React.useMemo(() => {
        const byGroup = new Map();
        for (const model of normalized) {
          if (!byGroup.has(model.providerGroup)) byGroup.set(model.providerGroup, model.providerLabel);
        }
        return [...byGroup.entries()].sort((a, b) => a[1].localeCompare(b[1]));
      }, [normalized]);
      const availableTags = React.useMemo(() => {
        const tags = new Set(normalized.flatMap(model => model.tags));
        return MODEL_TAG_ORDER.filter(tag => tags.has(tag));
      }, [normalized]);
      const filtered = React.useMemo(() => {
        const needle = query.trim().toLowerCase();
        const rows = normalized.filter(model => {
          const haystack = `${model.name} ${model.id} ${model.providerLabel} ${model.tags.join(' ')}`.toLowerCase();
          return (!needle || haystack.includes(needle))
            && (providerFilter === 'all' || model.providerGroup === providerFilter)
            && (tagFilter === 'all' || model.tags.includes(tagFilter));
        });
        return rows.sort((a, b) => {
          if (sortBy === 'cost') return modelSortCost(a) - modelSortCost(b) || a.name.localeCompare(b.name);
          if (sortBy === 'context') return (b.contextWindow || 0) - (a.contextWindow || 0) || a.name.localeCompare(b.name);
          if (sortBy === 'name') return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
          return a.providerLabel.localeCompare(b.providerLabel) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
        });
      }, [normalized, providerFilter, query, sortBy, tagFilter]);
      const groups = React.useMemo(() => {
        const result = [];
        const byKey = new Map();
        for (const model of filtered) {
          let group = byKey.get(model.providerGroup);
          if (!group) {
            group = { key: model.providerGroup, label: model.providerLabel, models: [] };
            byKey.set(model.providerGroup, group);
            result.push(group);
          }
          group.models.push(model);
        }
        return result;
      }, [filtered]);
      const selectedSet = new Set(value.mode === 'all' ? available.map(model => model.id) : value.ids);
      const selectedCount = value.mode === 'all' ? available.length : value.ids.length;
      const staleCount = value.mode === 'custom'
        ? value.ids.filter(id => !available.some(model => model.id === id)).length
        : 0;
      const filteredIds = filtered.map(model => model.id);
      const checkStyle = {
        width: 15, height: 15, margin: 0, flex: 'none', cursor: 'pointer',
        accentColor: 'var(--dsw-alias-state-business-primary)',
      };
      const setCustom = ids => setSel({ mode: 'custom', ids: [...new Set(ids)] });
      const switchToCustom = () => setCustom(value.mode === 'all' ? available.map(model => model.id) : value.ids);
      const toggleModel = id => {
        if (value.mode !== 'custom') return;
        setCustom(selectedSet.has(id) ? value.ids.filter(item => item !== id) : [...value.ids, id]);
      };
      const save = () => {
        if (value.mode === 'custom' && value.ids.length === 0) {
          onSave(null, t('modelEmptyHint'));
          return;
        }
        onSave({ modelMode: value.mode, models: value.mode === 'all' ? [] : value.ids });
      };
      React.useEffect(() => {
        setQuery('');
        setProviderFilter('all');
        setTagFilter('all');
        setSortBy('provider');
        setCollapsedGroups(new Set());
      }, [data && data.id]);
      return React.createElement('div', { style: styles.card },
        React.createElement('div', { style: styles.cardHead },
          React.createElement('div', null,
            React.createElement('h3', { style: styles.cardName }, t('modelTitle')),
            React.createElement('p', { style: styles.cardMeta }, t('modelHint')),
          ),
          React.createElement('span', { style: { ...styles.badge, color: 'var(--dsw-alias-label-secondary)', borderColor: 'var(--dsw-alias-border-l2)' } },
            t('selectionCount').replace('{selected}', String(selectedCount)).replace('{total}', String(available.length))),
        ),
        data && data.catalogError
          ? React.createElement('p', { style: styles.error }, `${t('catalogError')}: ${data.catalogError}`)
          : null,
        available.length === 0
          ? React.createElement('p', { style: styles.hint }, t('modelUnavailable'))
          : React.createElement(React.Fragment, null,
            React.createElement('div', { style: styles.modelMode },
              React.createElement('span', { style: styles.cardMeta }, t('selectionMode')),
              React.createElement('label', { style: { ...styles.modelItemLabel, flex: '0 1 auto' } },
                React.createElement('input', {
                  type: 'checkbox',
                  style: checkStyle,
                  checked: value.mode === 'all',
                  disabled: busy !== null,
                  onChange: event => event.target.checked
                    ? setSel({ mode: 'all', ids: [] })
                    : setCustom(value.mode === 'all' ? available.map(model => model.id) : value.ids),
                }),
                React.createElement('span', null, t('allModels')),
              ),
              React.createElement('button', {
                type: 'button',
                style: { ...styles.modelModeButton, ...(value.mode === 'all' ? styles.buttonPrimary : {}) },
                'aria-pressed': value.mode === 'all',
                disabled: busy !== null,
                onClick: () => setSel({ mode: 'all', ids: [] }),
              }, t('allMode')),
              React.createElement('button', {
                type: 'button',
                style: { ...styles.modelModeButton, ...(value.mode === 'custom' ? styles.buttonPrimary : {}) },
                'aria-pressed': value.mode === 'custom',
                disabled: busy !== null,
                onClick: switchToCustom,
              }, t('customMode')),
            ),
            React.createElement('div', { style: styles.modelToolbar },
              React.createElement('input', {
                type: 'search',
                style: styles.compactInput,
                placeholder: t('modelSearch'),
                'aria-label': t('modelSearch'),
                value: query,
                onChange: event => setQuery(event.target.value),
              }),
              React.createElement('select', {
                style: styles.compactSelect,
                'aria-label': t('providerFilter'),
                value: providerFilter,
                onChange: event => setProviderFilter(event.target.value),
              },
                React.createElement('option', { value: 'all' }, t('allProviders')),
                providerOptions.map(([key, label]) => React.createElement('option', { key, value: key }, label)),
              ),
              React.createElement('select', {
                style: styles.compactSelect,
                'aria-label': t('capabilityFilter'),
                value: tagFilter,
                onChange: event => setTagFilter(event.target.value),
              },
                React.createElement('option', { value: 'all' }, t('allCapabilities')),
                availableTags.map(tag => React.createElement('option', { key: tag, value: tag }, tagLabel(tag, t))),
              ),
              React.createElement('select', {
                style: styles.compactSelect,
                'aria-label': t('sortBy'),
                value: sortBy,
                onChange: event => setSortBy(event.target.value),
              },
                React.createElement('option', { value: 'provider' }, `${t('sortBy')}: ${t('sortProvider')}`),
                React.createElement('option', { value: 'name' }, `${t('sortBy')}: ${t('sortName')}`),
                React.createElement('option', { value: 'cost' }, `${t('sortBy')}: ${t('sortCost')}`),
                React.createElement('option', { value: 'context' }, `${t('sortBy')}: ${t('sortContext')}`),
              ),
            ),
            React.createElement('div', { style: styles.modelToolbar },
              React.createElement('span', { style: styles.cardMeta }, t('filteredCount').replace('{n}', String(filtered.length))),
              React.createElement('button', {
                type: 'button',
                style: { ...styles.button, ...(value.mode === 'custom' ? {} : styles.buttonDisabled) },
                disabled: busy !== null || value.mode !== 'custom',
                onClick: () => setCustom([...value.ids, ...filteredIds]),
              }, t('selectAllFiltered')),
              React.createElement('button', {
                type: 'button',
                style: { ...styles.button, ...(value.mode === 'custom' ? {} : styles.buttonDisabled) },
                disabled: busy !== null || value.mode !== 'custom',
                onClick: () => setCustom(value.ids.filter(id => !filteredIds.includes(id))),
              }, t('clearFiltered')),
              React.createElement('button', {
                type: 'button',
                style: styles.button,
                disabled: busy !== null || filteredIds.length === 0,
                onClick: () => setCustom(filteredIds),
              }, t('keepFiltered')),
              React.createElement('button', {
                type: 'button',
                style: styles.button,
                disabled: busy !== null || value.mode !== 'custom',
                onClick: () => setCustom([]),
              }, t('clearSelection')),
              React.createElement('button', {
                type: 'button',
                style: styles.button,
                disabled: busy !== null || groups.length === 0,
                onClick: () => setCollapsedGroups(new Set()),
              }, t('expandAll')),
              React.createElement('button', {
                type: 'button',
                style: styles.button,
                disabled: busy !== null || groups.length === 0,
                onClick: () => setCollapsedGroups(new Set(groups.map(group => group.key))),
              }, t('collapseAll')),
            ),
            staleCount > 0
              ? React.createElement('p', { style: styles.error }, t('staleSelection').replace('{n}', String(staleCount)))
              : null,
            filtered.length === 0
              ? React.createElement('p', { style: styles.hint }, t('noFilteredModels'))
              : React.createElement('div', { style: styles.modelList },
                groups.map(group => React.createElement('section', { key: group.key, style: styles.modelGroup },
                  React.createElement('button', {
                    type: 'button',
                    style: styles.modelGroupHead,
                    'aria-expanded': !collapsedGroups.has(group.key),
                    onClick: () => {
                      const next = new Set(collapsedGroups);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      setCollapsedGroups(next);
                    },
                  },
                    React.createElement('span', { style: { fontWeight: 600 } }, t('modelGroupCount').replace('{label}', group.label).replace('{n}', String(group.models.length))),
                    React.createElement('span', { style: styles.cardMeta }, collapsedGroups.has(group.key) ? '▶' : '▼'),
                  ),
                  collapsedGroups.has(group.key)
                    ? null
                    : React.createElement('div', { style: styles.modelGroupBody }, group.models.map(model => {
                      const selected = value.mode === 'all' || selectedSet.has(model.id);
                      const tags = model.tags.slice(0, 4);
                      const price = modelPriceLabel(model, t);
                      const priceShort = modelPriceShort(model, t);
                      const context = modelContextLabel(model, t);
                      return React.createElement('div', { key: model.id, style: styles.modelItem },
                        React.createElement('label', { style: styles.modelItemLabel, title: model.id },
                          React.createElement('input', {
                            type: 'checkbox',
                            style: checkStyle,
                            checked: selected,
                            disabled: busy !== null || value.mode === 'all',
                            onChange: () => toggleModel(model.id),
                          }),
                          React.createElement('span', { style: styles.modelItemInfo },
                            React.createElement('span', { style: styles.modelItemName }, model.name),
                            React.createElement('span', { style: styles.modelItemId }, model.id),
                          ),
                        ),
                        React.createElement('div', { style: styles.modelMeta },
                          tags.map(tag => React.createElement('span', { key: tag, style: styles.badge }, tagLabel(tag, t))),
                          priceShort && !tags.includes('free') ? React.createElement('span', { style: { ...styles.badge, color: 'var(--dsw-alias-label-tertiary)' }, title: price }, priceShort) : null,
                          context ? React.createElement('span', { style: { ...styles.badge, color: 'var(--dsw-alias-label-tertiary)' } }, context) : null,
                        ),
                        React.createElement('button', {
                          type: 'button',
                          style: { ...styles.button, padding: '3px 8px', ...(busy !== null ? styles.buttonDisabled : {}) },
                          disabled: busy !== null,
                          'aria-label': `${t('onlyThis')}: ${model.name}`,
                          onClick: () => setCustom([model.id]),
                        }, t('onlyThis')),
                      );
                    })),
                )),
              ),
            selectedCount === 0
              ? React.createElement('p', { style: styles.error }, t('modelNone'))
              : null,
            React.createElement('div', { style: styles.actions },
              React.createElement('button', {
                style: { ...styles.button, ...styles.buttonPrimary, ...(busy !== null ? styles.buttonDisabled : {}) },
                disabled: busy !== null,
                onClick: save,
              }, t('save')),
            ),
          ),
      );
    }

    function PoolPage(props) {
      const { t, api } = props;
      const [rootData, setRootData] = React.useState(null);
      const [providerId, setProviderId] = React.useState('opencode-go');
      const [error, setError] = React.useState(null);
      const [failures, setFailures] = React.useState(0);
      const [pollMs, setPollMs] = React.useState(30000);
      const [tick, setTick] = React.useState(Date.now());
      const [busy, setBusy] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
      const [draft, setDraft] = React.useState(null);
      const [strategy, setStrategy] = React.useState(null);
      const [modelSel, setModelSel] = React.useState(null);
      const [refreshing, setRefreshing] = React.useState(false);
      const [loadedAt, setLoadedAt] = React.useState(null);

      const providers = Array.isArray(rootData && rootData.providers) ? rootData.providers : [];
      const selected = providers.find(item => item.id === providerId) || providers[0] || null;
      const selectedId = selected ? selected.id : providerId;
      const data = selected;

      React.useEffect(() => {
        if (selected && selected.id !== providerId) setProviderId(selected.id);
      }, [selected, providerId]);
      React.useEffect(() => {
        setDraft(null);
        setStrategy(null);
        setModelSel(null);
        setNotice(null);
      }, [selectedId]);

      const load = React.useCallback(async () => {
        setRefreshing(true);
        try {
          const remote = await api();
          if (!remote) throw new Error('accountPool remote is unavailable');
          const result = unwrapRemote(await remote.status());
          setRootData(result);
          setError(null);
          setFailures(0);
          setLoadedAt(new Date());
          const refreshes = Array.isArray(result && result.providers)
            ? result.providers.map(item => item.usageRefreshMs).filter(value => typeof value === 'number' && value > 0)
            : [];
          if (refreshes.length > 0) {
            setPollMs(Math.min(...refreshes));
          }
        } catch (err) {
          setFailures(prev => prev + 1);
          setError(String((err && err.message) || err));
        } finally {
          setRefreshing(false);
        }
      }, [api]);

      React.useEffect(() => { load(); }, [load]);
      React.useEffect(() => {
        if (failures >= 3) return undefined;
        const timer = setInterval(() => { load(); }, pollMs);
        return () => clearInterval(timer);
      }, [load, pollMs, failures]);
      React.useEffect(() => {
        const timer = setInterval(() => setTick(Date.now()), 1000);
        return () => clearInterval(timer);
      }, []);

      const runAction = React.useCallback(async (fn, confirmText) => {
        if (confirmText && !window.confirm(confirmText)) return;
        setBusy(confirmText || 'busy');
        setNotice(null);
        try {
          const remote = await api();
          if (!remote) throw new Error('accountPool remote is unavailable');
          await unwrapRemote(await fn(remote));
          await load();
          return true;
        } catch (err) {
          setNotice({ ok: false, text: `${t('actionFailed')}: ${String((err && err.message) || err)}` });
          return false;
        } finally {
          setBusy(null);
        }
      }, [api, load, t]);

      const onKeyAction = (kind, id, confirmText, extra) => {
        runAction(async remote => {
          if (kind === 'setActive') return remote.setActive(selectedId, id);
          if (kind === 'setDisabled') return remote.setDisabled(selectedId, id, extra !== false);
          return remote.clearInvalid(selectedId, id);
        }, confirmText);
      };

      const onSaveKeys = (rows, invalidMessage) => {
        if (!rows) {
          setNotice({ ok: false, text: `${t('saveFailed')}: ${invalidMessage}` });
          return;
        }
        runAction(async remote => {
          // Persist the key list first; an empty reference name auto-generates
          // from the key id, so pasting just a label + secret always works.
          const keys = rows.map(row => ({
            id: row.id,
            label: row.label,
            apiKeyEnv: row.apiKeyEnv || providerEnvPrefix(selectedId) + row.id.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase(),
          }));
          let result = await remote.putKeys(selectedId, keys);
          if (result && result.ok === false) return result; // keep the draft on refusal
          for (const row of rows) {
            if (!row.secret) continue;
            result = await remote.putKeySecret(selectedId, row.id, row.secret);
            if (result && result.ok === false) return result;
          }
          return result;
        }, null)
          .then(ok => {
            if (!ok) return;
            setDraft(null);
            setNotice(prev => prev && !prev.ok ? prev : { ok: true, text: t('saved') });
          });
      };

      const onSetStrategy = (patch) => {
        runAction(async remote => remote.putConfig(selectedId, patch), null)
          .then(ok => {
            if (!ok) return;
            setStrategy(null); // re-derive the form from the server values
            setNotice(prev => prev && !prev.ok ? prev : { ok: true, text: t('saved') });
          });
      };

      const onSetModels = (patch) => {
        runAction(async remote => remote.putConfig(selectedId, patch), null)
          .then(ok => {
            if (!ok) return;
            setModelSel(null); // re-derive the checkboxes from the server values
            setNotice(prev => prev && !prev.ok ? prev : { ok: true, text: t('saved') });
          });
      };

      const onRefreshModels = () => {
        runAction(async remote => remote.refreshModels(selectedId), null);
      };

      const takeover = data ? data.takeover : null;
      const keys = Array.isArray(data && data.keys) ? data.keys : [];

      return React.createElement('div', { style: styles.wrap },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', { style: { color: 'var(--dsw-alias-state-business-primary)' } },
            React.createElement(GoMark, { size: 24 }),
          ),
          React.createElement('div', null,
            React.createElement('h2', { style: styles.title }, t('title')),
            React.createElement('p', { style: styles.subtitle }, t('subtitle')),
          ),
        ),
        React.createElement('div', { style: styles.providerTabs, role: 'tablist' },
          PROVIDER_IDS.map(id => React.createElement('button', {
            key: id,
            type: 'button',
            role: 'tab',
            'aria-selected': selectedId === id,
            style: {
              ...styles.providerTab,
              ...(selectedId === id ? styles.providerTabActive : {}),
            },
            onClick: () => setProviderId(id),
          },
            React.createElement('span', { style: { fontWeight: 600 } }, providerLabel(id, t)),
            React.createElement('span', { style: styles.providerHint }, providerHint(id, t)),
          )),
        ),
        data === null && !error
          ? React.createElement('p', { style: styles.hint }, t('loading'))
          : null,
        error
          ? React.createElement('div', { style: styles.banner },
            React.createElement('p', { style: styles.error }, `${t('loadFailed')}: ${error}`),
            failures >= 3 ? React.createElement('p', { style: styles.hint }, t('paused')) : null,
            React.createElement('button', { style: styles.button, onClick: () => { setFailures(0); load(); } }, t('refresh')),
          )
          : null,
        data === null
          ? null
          : React.createElement(React.Fragment, null,
            React.createElement('div', { style: { ...styles.banner, ...(takeover === 'waiting' ? styles.bannerWarn : styles.bannerOk) } },
              React.createElement('p', { style: { margin: 0, fontWeight: 600 } },
                (takeover === 'serving' ? t('takeoverServing')
                  : takeover === 'own-route' ? t('takeoverOwnRoute')
                    : takeover === 'disabled' ? t('takeoverDisabled')
                      : t('takeoverWaiting')).replace('{route}', data.route || selectedId)),
              takeover === 'waiting'
                ? React.createElement('p', { style: styles.hint }, `${t('takeoverWaitingHint').replace('{route}', data.route || selectedId)}${data.takeoverHint ? ` ${data.takeoverHint}` : ''}`)
                : null,
              takeover === 'disabled'
                ? React.createElement('p', { style: styles.hint }, t('takeoverDisabledHint'))
                : null,
              data.activeId
                ? React.createElement('p', { style: styles.hint },
                    `${t('activeBanner')}: ${data.activeId} · ${t('preemptNote')}: ${data.preemptAtPercent >= 100 ? t('preemptOff') : data.preemptAtPercent + '%'} · ${t('consecNote')}: ${data.switchAfterConsecutiveFailures > 0 ? data.switchAfterConsecutiveFailures : t('preemptOff')}`)
                : null,
              data.lastSwitch
                ? React.createElement('p', { style: styles.hint }, `${t('lastSwitch')}: ${data.lastSwitch.from ?? '—'} → ${data.lastSwitch.to ?? '—'} (${data.lastSwitch.reason === 'quota' ? t('switchQuota') : data.lastSwitch.reason === 'invalid' ? t('switchInvalid') : data.lastSwitch.reason === 'consecutive' ? t('switchConsecutive') : t('switchManual')}) @ ${new Date(data.lastSwitch.at).toLocaleString()}`)
                : null,
              keys.length > 0 && data.activeId === null
                ? React.createElement('p', { style: styles.error }, t('noKeysHint'))
                : null,
            ),
            React.createElement(ModelCard, {
              t, data, sel: modelSel, setSel: setModelSel, busy,
              onSave: (patch, invalidMessage) => {
                if (!patch) {
                  setNotice({ ok: false, text: `${t('saveFailed')}: ${invalidMessage}` });
                  return;
                }
                onSetModels(patch);
              },
            }),
            keys.length > 0
              ? React.createElement(StrategyCard, {
                  t, data, strategy, setStrategy, busy,
                  onSave: (patch, invalidMessage) => {
                    if (!patch) {
                      setNotice({ ok: false, text: `${t('saveFailed')}: ${invalidMessage}` });
                      return;
                    }
                    onSetStrategy(patch);
                  },
                })
              : null,
            keys.length === 0 && takeover !== 'waiting'
              ? React.createElement('div', { style: styles.banner },
                React.createElement('p', { style: { margin: 0, fontWeight: 600 } }, t('noKeysTitle')),
                React.createElement('p', { style: styles.hint }, t('noKeysHint')),
              )
              : null,
            keys.map(item => React.createElement(KeyCard, {
              key: item.id, item, t, tick, busy,
              onAction: onKeyAction,
            })),
            draft === null
              ? React.createElement('button', {
                style: styles.button,
                disabled: busy !== null,
                onClick: () => setDraft(keys.map(k => ({ id: k.id, label: k.label, apiKeyEnv: k.apiKeyEnv, secret: '' }))),
              }, t('manageTitle'))
              : React.createElement(Editor, { draft, setDraft, t, busy, onSave: onSaveKeys, existingKeys: keys }),
            notice
              ? React.createElement('p', { style: { ...styles.notice, ...(notice.ok ? styles.noticeOk : styles.noticeErr) } }, notice.text)
              : null,
            React.createElement('div', { style: styles.actions },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                React.createElement('button', { style: styles.button, disabled: busy !== null || refreshing, onClick: load }, refreshing ? t('refreshing') : t('refresh')),
                React.createElement('button', { style: styles.button, disabled: busy !== null || refreshing, onClick: onRefreshModels }, t('refreshModels')),
                loadedAt
                  ? React.createElement('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } }, `${t('updatedAt')} ${loadedAt.toLocaleTimeString()}`)
                  : null,
              ),
            ),
          ),
      );
    }

    // The nav-row sparkle mark: same geometry as the shell's IconSparkle16,
    // so the sidebar entry matches the built-in icon language exactly. The
    // shell hardcodes a gear for unknown section ids; a one-line injected
    // rule hides it for OUR row only (graceful: without :has() support the
    // row just shows both icons).
    function SparkleNavMark(props) {
      const { className } = props;
      return React.createElement('svg', {
        width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none',
        className, 'aria-hidden': 'true',
        style: { display: 'inline-block', flex: 'none', marginRight: 8, verticalAlign: '-3px' },
      },
        React.createElement('path', { d: 'M6.1 3.1Q6.6 7.8 11.3 8.3Q6.6 8.8 6.1 13.5Q5.6 8.8 0.9 8.3Q5.6 7.8 6.1 3.1Z', fill: 'currentColor' }),
        React.createElement('path', { d: 'M11.9 1Q12.2 3.7 14.9 4Q12.2 4.3 11.9 7Q11.6 4.3 8.9 4Q11.6 3.7 11.9 1Z', fill: 'currentColor' }),
        React.createElement('path', { d: 'M12.5 9.4Q12.7 11.4 14.7 11.6Q12.7 11.8 12.5 13.8Q12.3 11.8 10.3 11.6Q12.3 11.4 12.5 9.4Z', fill: 'currentColor' }),
      );
    }

    function navLabel(t) {
      return React.createElement(React.Fragment, null,
        React.createElement(SparkleNavMark, { className: 'dsh-ap-nav-mark' }),
        React.createElement('span', null, t('nav')),
      );
    }

    function injectNavStyle() {
      if (typeof document === 'undefined') return;
      if (document.getElementById('dsh-ap-nav-style')) return;
      const style = document.createElement('style');
      style.id = 'dsh-ap-nav-style';
      // Hide the shell's default gear icon on our nav row only.
      style.textContent = 'button:has(.dsh-ap-nav-mark) > svg { display: none; }';
      document.head.appendChild(style);
    }

    function apply(ctx) {
      const mountReady = ctx.remote.$mount(TYPERT_REMOTE);
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-account-pool: dictionaries');
      const t = ctx.locale.bind(NS);
      injectNavStyle();

      const api = async () => {
        await mountReady;
        const remote = ctx.get('remote.accountPool');
        return remote || null;
      };
      const injected = () => ({ t, api });

      // Error boundary: any render crash inside the page becomes a VISIBLE
      // diagnostic instead of a blank content column, so problems self-report.
      class PoolPageBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { error: null };
        }
        static getDerivedStateFromError(error) {
          return { error };
        }
        render() {
          if (this.state.error !== null) {
            const err = this.state.error;
            return React.createElement('div', {
              style: {
                padding: 16,
                border: '1px solid var(--dsw-alias-state-error-primary)',
                borderRadius: 10,
                color: 'var(--dsw-alias-state-error-primary)',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              },
            },
              React.createElement('p', { style: { margin: 0, fontWeight: 600 } }, '多 Provider 账号池 · 渲染异常'),
              React.createElement('p', { style: { margin: '8px 0 0' } }, String((err && err.message) || err)),
              React.createElement('p', { style: { margin: '8px 0 0', opacity: 0.75 } }, String((err && err.stack) || '').slice(0, 1200)),
            );
          }
          return React.createElement(PoolPage, this.props);
        }
      }

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'account-pool',
        order: 41,
        label: () => {
          try {
            return navLabel(t);
          } catch {
            // Degrade to plain text if the shell ever rejects element labels.
            return t('nav');
          }
        },
        locale: NS,
        inject: injected,
      }, PoolPageBoundary));
    }

    exports.NS = NS;
    exports.apply = apply;
    exports.inject = inject;
    // Render-path test hooks (unused by the runtime; see test/client.test.mjs).
    exports.__test = {
      KeyCard, UsageBar, CreditUsage, badgeFor, fmtReset, usageErrorText,
      PoolPage, ModelCard, GoMark, TYPERT_REMOTE, unwrapRemote,
      providerLabel, providerHint, providerEnvPrefix,
    };
    return module.exports;
  }
});
