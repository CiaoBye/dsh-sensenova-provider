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
      nav: '账号池切换',
      title: '账号池切换',
      subtitle: '账号切换工作台 · OpenCode Go · OpenCode Zen · OpenRouter',
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
      sectionOverview: '账号切换',
      sectionAccounts: '账号管理',
      sectionModels: '模型目录',
      sectionRouting: '路由设置',
      settingsTitle: '设置',
      settingsHint: '模型目录、账号管理和自动接管策略集中在这里。',
      currentSource: '当前来源',
      sourceHint: '切换来源只改变当前 Provider 上下文，不会修改模型目录或账号配置。',
      switchWorkspace: '账号切换',
      switchWorkspaceHint: '优先选择要服务的账号；模型目录和高级策略在设置中管理。',
      currentAccount: '当前账号',
      accountPoolSummary: '账号池',
      runtimeStatus: '运行状态',
      accountListTitle: '账号列表',
      accountListEmptyHint: '在“账号管理”中添加 Key 后，这里会显示可切换账号。',
      usableSummary: '{usable}/{total} 可用',
      switchSettings: '切号设置',
      addAccount: '添加账号',
      manageAccounts: '管理账号',
      openSettings: '打开设置',
      backToSwitch: '返回账号切换',
      overviewTitle: 'Provider 概览',
      overviewHint: '先确认账号池健康状态，再进入模型目录或路由设置。',
      accountSummary: '账号状态',
      accountCount: '{n} 个账号',
      healthyCount: '{n} 个可用',
      activeKey: '当前使用',
      noActiveKey: '暂无当前账号',
      routeSummary: '路由状态',
      catalogSummary: '模型目录',
      modelSummary: '{n} 个模型',
      configuredSummary: '已配置 {n} 个',
      recentSwitch: '最近一次切换',
      noSwitch: '暂无切换记录',
      openSection: '进入',
      viewDetails: '查看详情',
      collapseDetails: '收起详情',
      routeOwnerHint: '当前路由由其他插件持有。',
      routeServingHint: '本账号池正在提供该 Provider 路由。',
      routeDisabledHint: '账号池接管已关闭。',
      poolEnabled: '账号池启用',
      takeoverEnabled: '自动接管',
      enabledState: '已开启',
      disabledState: '已关闭',
      enablePool: '启用账号池',
      disablePool: '停用账号池',
      enableTakeover: '开启自动接管',
      disableTakeover: '关闭自动接管',
      switchHistory: '切换记录',
      historyEmpty: '暂无切换记录；发生额度耗尽、凭据失效或手动切换后会显示在这里。',
      recentSwitches: '{n} 条记录',
      routeDetail: '路由详情',
      confirmDisablePool: '停用账号池后，该 Provider 不再参与请求。确定继续？',
      confirmDisableTakeover: '关闭自动接管后，该 Provider 路由不会由本插件接管。确定继续？',
      takeoverServing: '服务中 · 路由 {route} 已接管',
      takeoverOwnRoute: '自有路由模式 · {route}',
      takeoverWaiting: '等待接管',
      takeoverWaitingHint: '{route} 路由当前由其他插件持有。释放该供应商路由后，本插件会自动接管，历史会话无需任何改动。',
      poolDisabled: '账号池已停用',
      poolDisabledHint: '该 Provider 的账号池已停用，账号不会参与请求和自动切换。',
      takeoverDisabled: '自动接管已关闭',
      takeoverDisabledHint: '账号池仍保留配置，但不会主动接管该 Provider 路由。',
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
      allModeHint: '目录同步模式：新模型自动可用',
      catalogBadge: '目录同步',
      selectedBadge: '已选',
      selectionSummary: '当前选择',
      noSelection: '尚未选择模型',
      keepSelected: '仅保留已选',
      modelListHint: '按提供商分组；超过 2 个模型的分组默认折叠。',
      selectionCount: '已选 {selected} / {total}',
      filteredCount: '当前结果 {n} 个',
      selectAllFiltered: '全选当前结果',
      clearFiltered: '取消当前结果',
      keepFiltered: '只保留当前结果',
      clearSelection: '清空选择',
      resetFilters: '重置筛选',
      expandAll: '全部展开',
      collapseAll: '全部折叠',
      onlyThis: '仅保留此模型',
      selectGroup: '选此组',
      clearGroup: '清除此组',
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
      nav: 'Account pool switcher',
      title: 'Account pool switcher',
      subtitle: 'Account switching workspace for OpenCode Go, Zen, and OpenRouter',
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
      sectionOverview: 'Account switcher',
      sectionAccounts: 'Account management',
      sectionModels: 'Model catalog',
      sectionRouting: 'Routing settings',
      settingsTitle: 'Settings',
      settingsHint: 'Manage the model catalog, accounts, and automatic takeover policies here.',
      currentSource: 'Current source',
      sourceHint: 'Changing the source only changes the current Provider context; it does not modify model or account configuration.',
      switchWorkspace: 'Account switcher',
      switchWorkspaceHint: 'Choose the account that should serve requests first; model catalog and advanced policies live in Settings.',
      currentAccount: 'Current account',
      accountPoolSummary: 'Account pool',
      runtimeStatus: 'Runtime status',
      accountListTitle: 'Account list',
      accountListEmptyHint: 'Add keys in Account management to see switchable accounts here.',
      usableSummary: '{usable}/{total} usable',
      switchSettings: 'Switching settings',
      addAccount: 'Add account',
      manageAccounts: 'Manage accounts',
      openSettings: 'Open settings',
      backToSwitch: 'Back to account switcher',
      overviewTitle: 'Provider overview',
      overviewHint: 'Check pool health first, then manage the model catalog or routing rules.',
      accountSummary: 'Account status',
      accountCount: '{n} accounts',
      healthyCount: '{n} usable',
      activeKey: 'active',
      noActiveKey: 'no active account',
      routeSummary: 'Route status',
      catalogSummary: 'Model catalog',
      modelSummary: '{n} models',
      configuredSummary: '{n} configured',
      recentSwitch: 'Last switch',
      noSwitch: 'No switch recorded',
      openSection: 'Open',
      viewDetails: 'View details',
      collapseDetails: 'Hide details',
      routeOwnerHint: 'Another plugin currently owns this route.',
      routeServingHint: 'This pool is serving the Provider route.',
      routeDisabledHint: 'Provider takeover is disabled.',
      poolEnabled: 'Pool enabled',
      takeoverEnabled: 'Automatic takeover',
      enabledState: 'On',
      disabledState: 'Off',
      enablePool: 'Enable pool',
      disablePool: 'Disable pool',
      enableTakeover: 'Enable takeover',
      disableTakeover: 'Disable takeover',
      switchHistory: 'Switch history',
      historyEmpty: 'No switches recorded yet. Quota, credential, and manual switches will appear here.',
      recentSwitches: '{n} records',
      routeDetail: 'Route details',
      confirmDisablePool: 'Disable the pool? This Provider will stop serving requests.',
      confirmDisableTakeover: 'Disable automatic takeover? This plugin will not claim the Provider route.',
      takeoverServing: 'Serving · {route} route taken over',
      takeoverOwnRoute: 'Own route mode · {route}',
      takeoverWaiting: 'Waiting for takeover',
      takeoverWaitingHint: 'The {route} route is currently owned by another plugin. Release that provider route and this plugin takes over automatically — existing conversations keep working unchanged.',
      poolDisabled: 'Account pool disabled',
      poolDisabledHint: 'The account pool is disabled for this Provider, so its accounts will not serve requests or fail over.',
      takeoverDisabled: 'Automatic takeover off',
      takeoverDisabledHint: 'The account pool configuration remains available, but it will not claim this Provider route.',
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
      allModeHint: 'Catalog sync: new models become available automatically',
      catalogBadge: 'catalog sync',
      selectedBadge: 'selected',
      selectionSummary: 'Current selection',
      noSelection: 'No models selected',
      keepSelected: 'Keep selected only',
      modelListHint: 'Grouped by provider; groups with more than 2 models start collapsed.',
      selectionCount: '{selected} / {total} selected',
      filteredCount: '{n} results',
      selectAllFiltered: 'Select filtered',
      clearFiltered: 'Clear filtered',
      keepFiltered: 'Keep filtered only',
      clearSelection: 'Clear selection',
      resetFilters: 'Reset filters',
      expandAll: 'Expand all',
      collapseAll: 'Collapse all',
      onlyThis: 'Keep only this',
      selectGroup: 'Select group',
      clearGroup: 'Clear group',
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
      wrap: { width: '100%', maxWidth: 'none', minWidth: 0, minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' },
      header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
      providerContext: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(0, 1.6fr)', gap: 12, alignItems: 'center', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 8, padding: '9px 12px' },
      providerContextLabel: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 11, margin: 0 },
      providerContextSelect: { width: '100%', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', borderRadius: 6, padding: '7px 8px', minWidth: 0 },
      providerContextMeta: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', minWidth: 0 },
      providerContextStatus: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, whiteSpace: 'nowrap' },
      providerContextCount: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, whiteSpace: 'nowrap' },
      providerTabs: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, borderBottom: '1px solid var(--dsw-alias-border-l2)', paddingBottom: 10 },
      providerTab: { minWidth: 0, minHeight: 64, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 3, border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', font: 'inherit', cursor: 'pointer', background: 'transparent', borderRadius: 8, padding: '10px 12px', textAlign: 'left' },
      providerTabActive: { borderColor: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-3)' },
      providerHint: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.35 },
      title: { fontSize: 16, fontWeight: 600, margin: 0 },
      subtitle: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, margin: '2px 0 0' },
      sectionTabs: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid var(--dsw-alias-border-l2)', paddingBottom: 2 },
      sectionTab: { border: 0, borderBottom: '2px solid transparent', color: 'var(--dsw-alias-label-secondary)', font: 'inherit', cursor: 'pointer', background: 'transparent', padding: '8px 10px', minHeight: 40 },
      sectionTabActive: { color: 'var(--dsw-alias-state-business-primary)', borderBottomColor: 'var(--dsw-alias-state-business-primary)', fontWeight: 600 },
      settingsHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
      settingsTitle: { fontSize: 15, fontWeight: 600, margin: 0 },
      settingsHint: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, lineHeight: 1.5, margin: '3px 0 0' },
      switchLayout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(260px, .75fr)', gap: 12, alignItems: 'stretch' },
      switchPanel: { boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
      switchPanelActions: { marginTop: 'auto' },
      activeAccountPanel: { border: '1px solid var(--dsw-alias-state-business-primary)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 10, padding: '16px 18px', minWidth: 0, boxSizing: 'border-box' },
      activeAccountLabel: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, margin: 0 },
      activeAccountName: { fontSize: 24, fontWeight: 650, lineHeight: 1.25, margin: '6px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      activeAccountMeta: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      switchStatGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 14 },
      switchStat: { borderTop: '1px solid var(--dsw-alias-border-l2)', paddingTop: 8, minWidth: 0 },
      switchStatValue: { fontSize: 16, fontWeight: 600, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      switchEmpty: { border: '1px dashed var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', borderRadius: 8, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 7 },
      accountListHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
      hint: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 13, lineHeight: 1.6, margin: 0 },
      error: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 13, lineHeight: 1.6, margin: 0 },
      banner: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 },
      bannerWarn: { borderColor: 'var(--dsw-alias-state-warning-primary, #d97706)', color: 'var(--dsw-alias-label-primary)' },
      bannerOk: { borderColor: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary)' },
      statusStrip: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
      statusStripWarn: { borderColor: 'var(--dsw-alias-state-warning-primary, #d97706)' },
      statusStripOk: { borderColor: 'var(--dsw-alias-state-business-primary)' },
      statusStripMain: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' },
      statusDot: { width: 8, height: 8, borderRadius: '50%', flex: 'none', background: 'var(--dsw-alias-label-tertiary)' },
      statusDotWarn: { background: 'var(--dsw-alias-state-warning-primary, #d97706)' },
      statusDotOk: { background: 'var(--dsw-alias-state-business-primary)' },
      statusStripText: { fontWeight: 600 },
      statusStripMeta: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12 },
      overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 },
      metricCard: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 8, padding: '12px 14px', minWidth: 0 },
      metricLabel: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, margin: 0 },
      metricValue: { fontSize: 20, fontWeight: 650, margin: '6px 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      metricMeta: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      overviewColumns: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(240px, .8fr)', gap: 12, alignItems: 'stretch' },
      panel: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 10, padding: '14px 16px', minWidth: 0, boxSizing: 'border-box' },
      panelHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
      panelTitle: { fontSize: 14, fontWeight: 600, margin: 0 },
      panelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)', minWidth: 0 },
      panelRowLast: { borderBottom: 0 },
      panelRowLabel: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      panelRowValue: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, textAlign: 'right', flex: 'none' },
      keyGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
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
      modelCatalog: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 },
      modelCatalogHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
      modelCatalogTitle: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 280px' },
      modelCatalogCount: { flex: 'none', alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-label-secondary)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 999, padding: '5px 10px', whiteSpace: 'nowrap' },
      modelDirectoryHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
      modelDirectoryControls: { display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 360px', minWidth: 0 },
      modelDirectorySearch: { flex: '1 1 300px', minWidth: 180, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', borderRadius: 7, padding: '9px 11px' },
      modelModeCompact: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
      modelWorkspace: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 },
      modelFilterRail: { display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderTop: '1px solid var(--dsw-alias-border-l2)', borderBottom: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', minWidth: 0 },
      modelFilterLabel: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 11, margin: 0 },
      modelFilterSelect: { width: '100%', border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', borderRadius: 6, padding: '8px 9px', minWidth: 0 },
      modelFilterBlock: { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 150px', minWidth: 140 },
      modelBulkBar: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 34 },
      modelResultsColumn: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 },
      modelList: { display: 'flex', flexDirection: 'column', gap: 0, padding: '0 10px 10px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-3)', minWidth: 0 },
      modelVirtualCanvas: { display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 },
      modelVirtualGroup: { display: 'flex', alignItems: 'stretch', minHeight: 50, borderBottom: '1px solid var(--dsw-alias-border-l2)' },
      modelVirtualRow: { minHeight: 76, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, padding: '10px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)' },
      modelGroupAction: { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', font: 'inherit', cursor: 'pointer', background: 'transparent', borderRadius: 5, padding: '3px 8px', fontSize: 11, flex: 'none' },
      modelRowAction: { border: '1px solid var(--dsw-alias-border-l2)', color: 'var(--dsw-alias-label-secondary)', font: 'inherit', cursor: 'pointer', background: 'transparent', borderRadius: 5, padding: '5px 8px', fontSize: 11, flex: 'none' },
      modelCatalogFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--dsw-alias-border-l2)' },
      modelCatalogFooterState: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 },
      modelCatalogFooterActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' },
      modelSyncMark: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 5, color: 'var(--dsw-alias-state-business-primary)', border: '1px solid var(--dsw-alias-state-business-primary)', fontSize: 11, flex: 'none' },
      // Keep accordion sections at their natural height. Without this, a
      // tall model group is flex-shrunk to the available list height when
      // many groups are expanded, then overflow:hidden clips its rows.
      modelGroup: { flex: '0 0 auto' },
      modelGroupHead: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, border: 0, color: 'var(--dsw-alias-label-primary)', font: 'inherit', cursor: 'pointer', background: 'transparent', padding: '10px 4px', textAlign: 'left' },
      modelGroupBody: { display: 'flex', flexDirection: 'column', gap: 0, padding: '0 0 2px' },
      modelItem: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '5px 4px', borderRadius: 6 },
      modelItemLabel: { display: 'flex', alignItems: 'flex-start', gap: 9, flex: '1 1 300px', minWidth: 0, cursor: 'pointer' },
      modelItemInfo: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
      modelItemName: { fontWeight: 600, color: 'var(--dsw-alias-label-primary)', lineHeight: 1.35 },
      modelItemId: { opacity: 0.65, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      modelMeta: { display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto', maxWidth: '50%' },
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

    const MODEL_GROUP_LABELS = Object.freeze({
      ai21: 'AI21',
      'aion-labs': 'AionLabs',
      amazon: 'Amazon',
      anthropic: 'Anthropic',
      'arcee-ai': 'Arcee AI',
      auto: '自动路由',
      cohere: 'Cohere',
      deepseek: 'DeepSeek',
      google: 'Google',
      glm: 'GLM',
      grok: 'Grok',
      hy3: 'Hy3',
      kimi: 'Kimi',
      llama: 'Llama',
      minimax: 'MiniMax',
      mistral: 'Mistral AI',
      mimo: 'MiMo',
      openai: 'OpenAI',
      qwen: 'Qwen',
    });
    const MODEL_FAMILY_GROUPS = Object.freeze([
      ['deepseek', /(?:^|[-_\s])deepseek(?:[-_.\s]|$)/],
      ['glm', /(?:^|[-_\s])glm(?:[-_.\s]|$)/],
      ['grok', /(?:^|[-_\s])grok(?:[-_.\s]|$)/],
      ['hy3', /(?:^|[-_\s])hy3(?:[-_.\s]|$)/],
      ['kimi', /(?:^|[-_\s])kimi(?:[-_.\s]|$)/],
      ['mimo', /(?:^|[-_\s])mimo(?:[-_.\s]|$)/],
      ['minimax', /(?:^|[-_\s])minimax(?:[-_.\s]|$)/],
      ['qwen', /(?:^|[-_\s])qwen(?:\d|[-_.\s]|$)/],
      ['claude', /(?:^|[-_\s])claude(?:[-_.\s]|$)/],
      ['gemini', /(?:^|[-_\s])gemini(?:[-_.\s]|$)/],
      ['llama', /(?:^|[-_\s])llama(?:[-_.\s]|$)/],
      ['mistral', /(?:^|[-_\s])mistral(?:[-_.\s]|$)/],
      ['openai', /(?:^|[-_\s])(?:gpt|openai)(?:[-_.\s]|$)/],
    ]);

    function modelGroup(model) {
      if (model && typeof model.providerGroup === 'string' && model.providerGroup.length > 0) return model.providerGroup;
      const id = String((model && model.id) || 'other');
      const slash = id.indexOf('/');
      if (slash > 0) return id.slice(0, slash).replace(/^~/, '') || 'other';
      const name = String((model && model.name) || '');
      const text = `${id} ${name}`.toLowerCase();
      const family = MODEL_FAMILY_GROUPS.find(([, pattern]) => pattern.test(text));
      return (family ? family[0] : id).replace(/^~/, '') || 'other';
    }

    function modelGroupLabel(model) {
      if (model && typeof model.providerLabel === 'string' && model.providerLabel.length > 0) return model.providerLabel;
      const group = modelGroup(model);
      if (MODEL_GROUP_LABELS[group]) return MODEL_GROUP_LABELS[group];
      return group
        .split(/[-_]/g)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Other';
    }

    function defaultCollapsedGroups(groups) {
      return new Set(groups.filter(group => group.models.length > 2).map(group => group.key));
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

    function ModelRow(props) {
      const { model, t, value, selectedSet, toggleModel, keepOnlyModel, busy } = props;
      const selected = value.mode === 'all' || selectedSet.has(model.id);
      const tags = model.tags.slice(0, 3);
      const price = modelPriceLabel(model, t);
      const priceShort = modelPriceShort(model, t);
      const context = modelContextLabel(model, t);
      return React.createElement('div', { style: styles.modelVirtualRow },
        React.createElement('label', { style: styles.modelItemLabel, title: model.id },
          value.mode === 'all'
            ? React.createElement('span', { style: styles.modelSyncMark, title: t('allModeHint'), 'aria-label': t('catalogBadge') }, '✓')
            : React.createElement('input', {
              type: 'checkbox',
              style: { width: 15, height: 15, margin: 0, flex: 'none', cursor: 'pointer', accentColor: 'var(--dsw-alias-state-business-primary)' },
              checked: selected,
              disabled: busy !== null,
              'aria-label': model.name,
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
        value.mode === 'custom'
          ? React.createElement('button', {
            type: 'button',
            style: styles.modelRowAction,
            disabled: busy !== null,
            title: model.id,
            onClick: () => keepOnlyModel(model.id),
          }, t('onlyThis'))
          : null,
      );
    }

    /**
     * Single-scroll model list. The settings host owns the only vertical
     * scroll region; keeping the catalog in normal flow avoids a second
     * nested scrollbar while preserving grouped browsing for large catalogs.
     */
    function ModelList(props) {
      const {
        groups,
        collapsedGroups,
        setCollapsedGroups,
        selectedSet,
        value,
        toggleModel,
        toggleGroup,
        keepOnlyModel,
        busy,
        t,
      } = props;
      return React.createElement('div', {
        style: styles.modelList,
        'aria-label': t('sectionModels'),
      },
        React.createElement('div', { style: styles.modelVirtualCanvas },
          groups.map(group => {
            const selectedCount = group.models.filter(model => selectedSet.has(model.id)).length;
            const collapsed = collapsedGroups.has(group.key);
            const allSelected = value.mode === 'custom' && selectedCount === group.models.length;
            return React.createElement('div', { key: `group:${group.key}`, style: { ...styles.modelGroup, ...styles.modelVirtualGroup, flexDirection: 'column' } },
              React.createElement('div', { style: { display: 'flex', alignItems: 'stretch', minWidth: 0 } },
                React.createElement('button', {
                  type: 'button',
                  style: { ...styles.modelGroupHead, flex: '1 1 auto' },
                  'aria-expanded': !collapsed,
                  'aria-label': `${group.label} ${collapsed ? t('expandAll') : t('collapseAll')}`,
                  onClick: () => {
                    const next = new Set(collapsedGroups);
                    if (next.has(group.key)) next.delete(group.key);
                    else next.add(group.key);
                    setCollapsedGroups(next);
                  },
                },
                  React.createElement('span', { style: { fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                    `${group.models.length > 1 ? t('modelGroupCount').replace('{label}', group.label).replace('{n}', String(group.models.length)) : group.label}${value.mode === 'custom' && selectedCount > 0 ? ` · ${t('selectedBadge')} ${selectedCount}` : ''}`),
                  React.createElement('span', { style: styles.cardMeta, 'aria-hidden': 'true' }, collapsed ? '▶' : '▼'),
                ),
                value.mode === 'custom'
                  ? React.createElement('button', {
                    type: 'button',
                    style: styles.modelGroupAction,
                    disabled: busy !== null,
                    onClick: () => toggleGroup(group),
                  }, allSelected ? t('clearGroup') : t('selectGroup'))
                  : null,
              ),
              collapsed
                ? null
                : React.createElement('div', { style: styles.modelGroupBody },
                  group.models.map(model => React.createElement(ModelRow, {
                    key: model.id,
                    model,
                    t,
                    value,
                    selectedSet,
                    toggleModel,
                    keepOnlyModel,
                    busy,
                  })),
                ),
            );
          }),
        ),
      );
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
      const setCustom = ids => setSel({ mode: 'custom', ids: [...new Set(ids)] });
      const switchToCustom = () => setCustom(value.mode === 'all' ? available.map(model => model.id) : value.ids);
      const toggleModel = id => {
        if (value.mode !== 'custom') return;
        setCustom(selectedSet.has(id) ? value.ids.filter(item => item !== id) : [...value.ids, id]);
      };
      const toggleGroup = group => {
        if (value.mode !== 'custom') return;
        const groupIds = group.models.map(model => model.id);
        const groupSelected = groupIds.length > 0 && groupIds.every(id => selectedSet.has(id));
        setCustom(groupSelected
          ? value.ids.filter(id => !groupIds.includes(id))
          : [...value.ids, ...groupIds]);
      };
      const keepOnlyModel = id => {
        if (value.mode !== 'custom') return;
        setCustom([id]);
      };
      const save = () => {
        if (value.mode === 'custom' && value.ids.length === 0) {
          onSave(null, t('modelEmptyHint'));
          return;
        }
        onSave({ modelMode: value.mode, models: value.mode === 'all' ? [] : value.ids });
      };
      const resetFilters = () => {
        setQuery('');
        setProviderFilter('all');
        setTagFilter('all');
        setSortBy('provider');
      };
      React.useEffect(() => {
        resetFilters();
        setCollapsedGroups(defaultCollapsedGroups(groups));
      }, [available.length, data && data.id]);
      React.useEffect(() => {
        if (query.trim()) {
          setCollapsedGroups(new Set());
          return;
        }
        setCollapsedGroups(defaultCollapsedGroups(groups));
      }, [data && data.id, groups, providerFilter, query, tagFilter]);
      return React.createElement('section', { style: styles.modelCatalog, 'aria-labelledby': 'dsh-model-catalog-title' },
        React.createElement('div', { style: styles.modelCatalogHead },
          React.createElement('div', { style: styles.modelCatalogTitle },
            React.createElement('h3', { id: 'dsh-model-catalog-title', style: styles.cardName }, t('modelTitle')),
            React.createElement('p', { style: styles.cardMeta }, t('modelHint')),
          ),
          React.createElement('span', { style: styles.modelCatalogCount },
            t('selectionCount').replace('{selected}', String(selectedCount)).replace('{total}', String(available.length))),
        ),
        data && data.catalogError
          ? React.createElement('p', { style: styles.error }, `${t('catalogError')}: ${data.catalogError}`)
          : null,
        available.length === 0
          ? React.createElement('p', { style: styles.hint }, t('modelUnavailable'))
          : React.createElement(React.Fragment, null,
            React.createElement('div', { style: styles.modelDirectoryHead },
              React.createElement('div', { style: styles.modelModeCompact },
                React.createElement('span', { style: styles.cardMeta }, t('selectionMode')),
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
              React.createElement('div', { style: styles.modelDirectoryControls },
                React.createElement('input', {
                  type: 'search',
                  style: styles.modelDirectorySearch,
                  placeholder: t('modelSearch'),
                  'aria-label': t('modelSearch'),
                  value: query,
                  onChange: event => setQuery(event.target.value),
                }),
              ),
            ),
            React.createElement('div', { className: 'dsh-ap-model-workspace', style: styles.modelWorkspace },
              React.createElement('div', { className: 'dsh-ap-model-filter', style: styles.modelFilterRail, 'aria-label': t('capabilityFilter') },
                React.createElement('div', { style: styles.modelFilterBlock },
                  React.createElement('p', { style: styles.modelFilterLabel }, t('providerFilter')),
                  React.createElement('select', {
                    style: styles.modelFilterSelect,
                    'aria-label': t('providerFilter'),
                    value: providerFilter,
                    onChange: event => setProviderFilter(event.target.value),
                  },
                    React.createElement('option', { value: 'all' }, t('allProviders')),
                    providerOptions.map(([key, label]) => React.createElement('option', { key, value: key }, label)),
                  ),
                ),
                React.createElement('div', { style: styles.modelFilterBlock },
                  React.createElement('p', { style: styles.modelFilterLabel }, t('capabilityFilter')),
                  React.createElement('select', {
                    style: styles.modelFilterSelect,
                    'aria-label': t('capabilityFilter'),
                    value: tagFilter,
                    onChange: event => setTagFilter(event.target.value),
                  },
                    React.createElement('option', { value: 'all' }, t('allCapabilities')),
                    availableTags.map(tag => React.createElement('option', { key: tag, value: tag }, tagLabel(tag, t))),
                  ),
                ),
                React.createElement('div', { style: styles.modelFilterBlock },
                  React.createElement('p', { style: styles.modelFilterLabel }, t('sortBy')),
                  React.createElement('select', {
                    style: styles.modelFilterSelect,
                    'aria-label': t('sortBy'),
                    value: sortBy,
                    onChange: event => setSortBy(event.target.value),
                  },
                    React.createElement('option', { value: 'provider' }, t('sortProvider')),
                    React.createElement('option', { value: 'name' }, t('sortName')),
                    React.createElement('option', { value: 'cost' }, t('sortCost')),
                    React.createElement('option', { value: 'context' }, t('sortContext')),
                  ),
                ),
                React.createElement('span', { style: { ...styles.cardMeta, flex: '1 1 190px', minWidth: 180 } }, t('modelListHint')),
                React.createElement('div', { style: { ...styles.actions, marginLeft: 'auto' } },
                  React.createElement('button', { type: 'button', style: styles.button, disabled: groups.length === 0, onClick: resetFilters }, t('resetFilters')),
                  React.createElement('button', { type: 'button', style: styles.button, disabled: groups.length === 0, onClick: () => setCollapsedGroups(new Set()) }, t('expandAll')),
                  React.createElement('button', { type: 'button', style: styles.button, disabled: groups.length === 0, onClick: () => setCollapsedGroups(new Set(groups.map(group => group.key))) }, t('collapseAll')),
                ),
              ),
              React.createElement('div', { style: styles.modelResultsColumn },
                React.createElement('div', { style: styles.modelBulkBar },
                  React.createElement('span', { style: { ...styles.cardMeta, fontWeight: 600 } }, t('filteredCount').replace('{n}', String(filtered.length))),
                  value.mode === 'custom'
                    ? React.createElement(React.Fragment, null,
                      React.createElement('button', {
                        type: 'button',
                        style: styles.button,
                        disabled: busy !== null || filteredIds.length === 0,
                        onClick: () => setCustom([...value.ids, ...filteredIds]),
                      }, t('selectAllFiltered')),
                      React.createElement('button', {
                        type: 'button',
                        style: styles.button,
                        disabled: busy !== null || filteredIds.length === 0,
                        onClick: () => setCustom(value.ids.filter(id => !filteredIds.includes(id))),
                      }, t('clearFiltered')),
                      React.createElement('button', {
                        type: 'button',
                        style: styles.button,
                        disabled: busy !== null || filteredIds.length === 0,
                        onClick: () => setCustom(filteredIds),
                      }, t('keepFiltered')),
                    )
                    : React.createElement('span', { style: styles.cardMeta }, t('allModeHint')),
                ),
                staleCount > 0
                  ? React.createElement('p', { style: styles.error }, t('staleSelection').replace('{n}', String(staleCount)))
                  : null,
                filtered.length === 0
                  ? React.createElement('p', { style: styles.hint }, t('noFilteredModels'))
                  : React.createElement(ModelList, {
                    groups,
                    collapsedGroups,
                    setCollapsedGroups,
                    selectedSet,
                    value,
                    toggleModel,
                    toggleGroup,
                    keepOnlyModel,
                    busy,
                    t,
                  }),
              ),
              React.createElement('div', { style: styles.modelCatalogFooter },
                React.createElement('div', { style: styles.modelCatalogFooterState },
                  React.createElement('span', { style: { fontWeight: 600 } },
                    t('selectionCount').replace('{selected}', String(selectedCount)).replace('{total}', String(available.length))),
                  React.createElement('span', { style: styles.cardMeta }, value.mode === 'all' ? t('allModeHint') : t('customMode')),
                  value.mode === 'custom' && selectedCount === 0
                    ? React.createElement('span', { style: styles.error }, t('modelNone'))
                    : null,
                ),
                React.createElement('div', { style: styles.modelCatalogFooterActions },
                  value.mode === 'custom'
                    ? React.createElement(React.Fragment, null,
                      React.createElement('button', {
                        type: 'button',
                        style: styles.button,
                        disabled: busy !== null || selectedCount === 0,
                        onClick: () => setCustom(value.ids.filter(id => available.some(model => model.id === id))),
                      }, t('keepSelected')),
                      React.createElement('button', {
                        type: 'button',
                        style: styles.button,
                        disabled: busy !== null,
                        onClick: () => setCustom([]),
                      }, t('clearSelection')),
                    )
                    : null,
                  React.createElement('button', {
                    type: 'button',
                    style: { ...styles.button, ...styles.buttonPrimary, ...(busy !== null ? styles.buttonDisabled : {}) },
                    disabled: busy !== null || (value.mode === 'custom' && value.ids.length === 0),
                    onClick: save,
                  }, t('save')),
                ),
              ),
            ),
          ),
      );
    }

    function switchReasonLabel(lastSwitch, t) {
      if (!lastSwitch) return '';
      if (lastSwitch.reason === 'quota') return t('switchQuota');
      if (lastSwitch.reason === 'invalid') return t('switchInvalid');
      if (lastSwitch.reason === 'consecutive') return t('switchConsecutive');
      return t('switchManual');
    }

    function switchSummary(lastSwitch, t) {
      if (!lastSwitch) return t('noSwitch');
      const when = lastSwitch.at ? new Date(lastSwitch.at).toLocaleString() : '—';
      return `${lastSwitch.from ?? '—'} → ${lastSwitch.to ?? '—'} · ${switchReasonLabel(lastSwitch, t)} · ${when}`;
    }

    function routeStatusKind(data) {
      if (!data || data.enabled === false) return 'pool-disabled';
      if (data.takeoverEnabled === false || data.takeover === 'disabled') return 'takeover-disabled';
      if (data.takeover === 'serving') return 'serving';
      if (data.takeover === 'own-route') return 'own-route';
      return 'waiting';
    }

    function routeStatusTitle(data, t) {
      const route = data && (data.route || data.id);
      const kind = routeStatusKind(data);
      if (kind === 'pool-disabled') return t('poolDisabled');
      if (kind === 'takeover-disabled') return t('takeoverDisabled');
      if (kind === 'serving') return t('takeoverServing').replace('{route}', route);
      if (kind === 'own-route') return t('takeoverOwnRoute').replace('{route}', route);
      return t('takeoverWaiting');
    }

    function routeStatusDetail(data, t) {
      const route = data && (data.route || data.id);
      const kind = routeStatusKind(data);
      if (kind === 'pool-disabled') return t('poolDisabledHint');
      if (kind === 'takeover-disabled') return t('takeoverDisabledHint');
      if (kind === 'waiting') {
        return `${t('takeoverWaitingHint').replace('{route}', route)}${data && data.takeoverHint ? ` ${data.takeoverHint}` : ''}`;
      }
      if (data && data.activeId) {
        return `${t('activeBanner')}: ${data.activeId} · ${t('preemptNote')}: ${data.preemptAtPercent >= 100 ? t('preemptOff') : data.preemptAtPercent + '%'} · ${t('consecNote')}: ${data.switchAfterConsecutiveFailures > 0 ? data.switchAfterConsecutiveFailures : t('preemptOff')}`;
      }
      return t('noActiveKey');
    }

    function ProviderContext(props) {
      const { providers, selectedId, selected, t, onChange } = props;
      const items = Array.isArray(providers) && providers.length > 0
        ? providers
        : PROVIDER_IDS.map(id => ({ id }));
      const keys = Array.isArray(selected && selected.keys) ? selected.keys : [];
      const healthy = keys.filter(item => item.state === 'healthy').length;
      return React.createElement('div', { className: 'dsh-ap-provider-context', style: styles.providerContext },
        React.createElement('div', null,
          React.createElement('p', { style: styles.providerContextLabel }, t('currentSource')),
          React.createElement('select', {
            style: styles.providerContextSelect,
            value: selectedId,
            'aria-label': t('currentSource'),
            onChange: event => onChange(event.target.value),
          }, items.map(item => React.createElement('option', { key: item.id, value: item.id }, providerLabel(item.id, t)))),
          React.createElement('p', { style: { ...styles.cardMeta, marginTop: 3 } }, t('sourceHint')),
        ),
        React.createElement('div', { className: 'dsh-ap-provider-context-meta', style: styles.providerContextMeta },
          React.createElement('span', { style: styles.providerContextCount }, selected ? `${healthy}/${keys.length} · ${providerHint(selectedId, t)}` : t('loading')),
        ),
      );
    }

    function SwitchWorkspace(props) {
      const { data, t, keys, tick, busy, refreshing, onKeyAction, onNavigate, onRefresh } = props;
      const active = keys.find(item => item.active) || null;
      const healthy = keys.filter(item => item.state === 'healthy').length;
      return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement('div', { className: 'dsh-ap-switch-layout', style: styles.switchLayout },
          React.createElement('section', { style: { ...styles.activeAccountPanel, ...styles.switchPanel } },
            React.createElement('div', { style: styles.panelHead },
              React.createElement('div', null,
                React.createElement('h3', { style: styles.panelTitle }, t('switchWorkspace')),
                React.createElement('p', { style: styles.cardMeta }, t('switchWorkspaceHint')),
              ),
              active ? badgeFor(active.state, active.active, t) : null,
            ),
            React.createElement('p', { style: styles.activeAccountLabel }, t('currentAccount')),
            active
              ? React.createElement(React.Fragment, null,
                React.createElement('p', { style: styles.activeAccountName }, active.label),
                React.createElement('p', { style: styles.activeAccountMeta }, `${active.apiKeyEnv} · ${active.state}`),
              )
              : React.createElement('div', { style: styles.switchEmpty },
                React.createElement('strong', null, t('noActiveKey')),
                React.createElement('p', { style: styles.hint }, t('accountListEmptyHint')),
                React.createElement('div', { style: styles.actions },
                  React.createElement('button', { type: 'button', style: { ...styles.button, ...styles.buttonPrimary }, onClick: () => onNavigate('accounts') }, t('addAccount')),
                ),
              ),
              React.createElement('div', { className: 'dsh-ap-switch-stat-grid', style: styles.switchStatGrid },
                React.createElement('div', { style: styles.switchStat },
                React.createElement('p', { style: styles.activeAccountLabel }, t('accountListTitle')),
                React.createElement('p', { style: styles.switchStatValue }, `${healthy}/${keys.length}`),
              ),
              React.createElement('div', { style: styles.switchStat },
                React.createElement('p', { style: styles.activeAccountLabel }, t('recentSwitch')),
                React.createElement('p', { style: { ...styles.switchStatValue, fontSize: 13 } }, data.lastSwitch ? switchReasonLabel(data.lastSwitch, t) : t('noSwitch')),
              ),
            ),
            React.createElement('div', { style: { ...styles.actions, ...styles.switchPanelActions } },
              React.createElement('button', { type: 'button', style: styles.button, disabled: refreshing || busy !== null, onClick: onRefresh }, refreshing ? t('refreshing') : t('refresh')),
              React.createElement('button', { type: 'button', style: styles.button, onClick: () => onNavigate('accounts') }, t('manageAccounts')),
            ),
          ),
          React.createElement('section', { style: { ...styles.panel, ...styles.switchPanel } },
            React.createElement('div', { style: styles.panelHead },
              React.createElement('h3', { style: styles.panelTitle }, t('runtimeStatus')),
              React.createElement('span', { style: styles.cardMeta }, data.displayName),
            ),
            React.createElement('div', { style: styles.panelRow },
              React.createElement('span', { style: styles.panelRowLabel }, t('poolEnabled')),
              React.createElement('span', { style: styles.panelRowValue }, data.enabled === false ? t('disabledState') : t('enabledState')),
            ),
            React.createElement('div', { style: styles.panelRow },
              React.createElement('span', { style: styles.panelRowLabel }, t('takeoverEnabled')),
              React.createElement('span', { style: styles.panelRowValue }, data.takeoverEnabled === false ? t('disabledState') : t('enabledState')),
            ),
            React.createElement('div', { style: { ...styles.panelRow, ...styles.panelRowLast } },
              React.createElement('span', { style: styles.panelRowLabel }, t('recentSwitch')),
              React.createElement('span', { style: styles.panelRowValue }, data.lastSwitch ? switchReasonLabel(data.lastSwitch, t) : t('noSwitch')),
            ),
            React.createElement('div', { style: { ...styles.actions, ...styles.switchPanelActions } },
              React.createElement('button', { type: 'button', style: styles.button, onClick: () => onNavigate('routing') }, t('sectionRouting')),
            ),
          ),
        ),
        React.createElement('section', { style: styles.panel },
          React.createElement('div', { style: styles.accountListHead },
            React.createElement('h3', { style: styles.panelTitle }, t('accountListTitle')),
            React.createElement('span', { style: styles.cardMeta }, t('usableSummary').replace('{usable}', String(healthy)).replace('{total}', String(keys.length))),
          ),
          keys.length === 0
            ? React.createElement('div', { style: styles.switchEmpty },
              React.createElement('strong', null, t('noKeysTitle')),
              React.createElement('p', { style: styles.hint }, t('accountListEmptyHint')),
              React.createElement('div', { style: styles.actions },
                React.createElement('button', { type: 'button', style: { ...styles.button, ...styles.buttonPrimary }, onClick: () => onNavigate('accounts') }, t('addAccount')),
              ),
            )
            : React.createElement('div', { className: 'dsh-ap-key-grid', style: styles.keyGrid },
              keys.map(item => React.createElement(KeyCard, { key: item.id, item, t, tick, busy, onAction: onKeyAction })),
            ),
        ),
      );
    }

    /** Compact route status used across every inner section. */
    function TakeoverStrip(props) {
      const { data, t, keys } = props;
      const [expanded, setExpanded] = React.useState(false);
      if (!data) return null;
      const kind = routeStatusKind(data);
      const waiting = kind === 'waiting';
      const warning = waiting || kind === 'pool-disabled' || kind === 'takeover-disabled';
      const title = routeStatusTitle(data, t);
      const detail = routeStatusDetail(data, t);
      return React.createElement('div', {
        style: { ...styles.statusStrip, ...(warning ? styles.statusStripWarn : styles.statusStripOk) },
      },
        React.createElement('div', { style: styles.statusStripMain },
          React.createElement('span', { style: { ...styles.statusDot, ...(warning ? styles.statusDotWarn : styles.statusDotOk) }, 'aria-hidden': 'true' }),
          React.createElement('span', { style: styles.statusStripText }, title),
          keys.length > 0
            ? React.createElement('span', { style: styles.statusStripMeta }, `${keys.length} · ${data.activeId || '—'}`)
            : null,
        ),
        React.createElement('button', {
          type: 'button',
          style: styles.button,
          'aria-expanded': expanded,
          onClick: () => setExpanded(value => !value),
        }, expanded ? t('collapseDetails') : t('viewDetails')),
        expanded
          ? React.createElement('div', { style: { flexBasis: '100%', color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } },
              detail,
              data.lastSwitch
                ? React.createElement('div', { style: { marginTop: 4 } }, `${t('recentSwitch')}: ${switchSummary(data.lastSwitch, t)}`)
                : null,
            )
          : null,
      );
    }

    function OverviewPanel(props) {
      const { data, t, onNavigate } = props;
      const keys = Array.isArray(data && data.keys) ? data.keys : [];
      const models = Array.isArray(data && data.availableModels) ? data.availableModels : [];
      const usable = keys.filter(item => item.state === 'healthy').length;
      const configured = data && data.modelMode === 'custom'
        ? (Array.isArray(data.configuredModels) ? data.configuredModels.length : 0)
        : models.length;
      const active = keys.find(item => item.active) || null;
      const routeText = routeStatusTitle(data, t);
      return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement('div', { style: styles.panel },
          React.createElement('div', { style: styles.panelHead },
            React.createElement('div', null,
              React.createElement('h3', { style: styles.panelTitle }, t('overviewTitle')),
              React.createElement('p', { style: styles.cardMeta }, t('overviewHint')),
            ),
            React.createElement('span', { style: styles.cardMeta }, data.displayName),
          ),
          React.createElement('div', { className: 'dsh-ap-overview-grid', style: styles.overviewGrid },
            React.createElement('div', { style: styles.metricCard },
              React.createElement('p', { style: styles.metricLabel }, t('accountSummary')),
              React.createElement('p', { style: styles.metricValue }, t('accountCount').replace('{n}', String(keys.length))),
              React.createElement('p', { style: styles.metricMeta }, t('healthyCount').replace('{n}', String(usable))),
            ),
            React.createElement('div', { style: styles.metricCard },
              React.createElement('p', { style: styles.metricLabel }, t('catalogSummary')),
              React.createElement('p', { style: styles.metricValue }, t('modelSummary').replace('{n}', String(models.length))),
              React.createElement('p', { style: styles.metricMeta }, t('configuredSummary').replace('{n}', String(configured))),
            ),
            React.createElement('div', { style: styles.metricCard },
              React.createElement('p', { style: styles.metricLabel }, t('routeSummary')),
              React.createElement('p', { style: { ...styles.metricValue, fontSize: 16 } }, routeText),
              React.createElement('p', { style: styles.metricMeta }, active ? `${t('activeKey')}: ${active.label}` : t('noActiveKey')),
            ),
          ),
        ),
        React.createElement('div', { className: 'dsh-ap-overview-columns', style: styles.overviewColumns },
          React.createElement('div', { style: styles.panel },
            React.createElement('div', { style: styles.panelHead },
              React.createElement('h3', { style: styles.panelTitle }, t('accountSummary')),
              React.createElement('span', { style: styles.cardMeta }, `${usable}/${keys.length}`),
            ),
            keys.length === 0
              ? React.createElement('p', { style: styles.hint }, t('noKeysTitle'))
              : keys.map((item, index) => React.createElement('div', {
                key: item.id,
                style: index === keys.length - 1 ? { ...styles.panelRow, ...styles.panelRowLast } : styles.panelRow,
              },
                React.createElement('span', { style: styles.panelRowLabel }, `${item.label} · ${item.state}`),
                React.createElement('span', { style: styles.panelRowValue }, item.active ? t('activeKey') : item.apiKeyEnv),
              )),
          ),
          React.createElement('div', { style: styles.panel },
            React.createElement('div', { style: styles.panelHead },
              React.createElement('h3', { style: styles.panelTitle }, t('openSection')),
            ),
            React.createElement('div', { style: styles.actions },
              React.createElement('button', { type: 'button', style: { ...styles.button, ...styles.buttonPrimary }, onClick: () => onNavigate('models') }, t('sectionModels')),
              React.createElement('button', { type: 'button', style: styles.button, onClick: () => onNavigate('accounts') }, t('sectionAccounts')),
              React.createElement('button', { type: 'button', style: styles.button, onClick: () => onNavigate('routing') }, t('sectionRouting')),
            ),
            React.createElement('p', { style: { ...styles.cardMeta, marginTop: 10 } }, `${t('recentSwitch')}: ${switchSummary(data.lastSwitch, t)}`),
          ),
        ),
      );
    }

    function RoutingPanel(props) {
      const { data, t, busy, onSave } = props;
      const history = Array.isArray(data.switchHistory)
        ? data.switchHistory
        : data.lastSwitch ? [data.lastSwitch] : [];
      const poolEnabled = data.enabled !== false;
      const takeoverEnabled = data.takeoverEnabled !== false;
      const toggle = (field, current, confirmText) => {
        if (current && typeof window !== 'undefined' && typeof window.confirm === 'function' && !window.confirm(confirmText)) return;
        onSave({ [field]: !current });
      };
      return React.createElement(React.Fragment, null,
        React.createElement('div', { style: styles.panel },
          React.createElement('div', { style: styles.panelHead },
            React.createElement('div', null,
              React.createElement('h3', { style: styles.panelTitle }, t('routeDetail')),
              React.createElement('p', { style: styles.cardMeta }, `${data.displayName} · ${data.route}`),
            ),
            React.createElement('span', { style: styles.badge }, routeStatusTitle(data, t)),
          ),
          React.createElement('div', { style: styles.panelRow },
            React.createElement('span', { style: styles.panelRowLabel }, t('poolEnabled')),
            React.createElement('span', { style: styles.panelRowValue }, poolEnabled ? t('enabledState') : t('disabledState')),
          ),
          React.createElement('div', { style: styles.panelRow },
            React.createElement('span', { style: styles.panelRowLabel }, t('takeoverEnabled')),
            React.createElement('span', { style: styles.panelRowValue }, takeoverEnabled ? t('enabledState') : t('disabledState')),
          ),
          React.createElement('div', { style: { ...styles.panelRow, ...styles.panelRowLast } },
            React.createElement('span', { style: styles.panelRowLabel }, t('activeBanner')),
            React.createElement('span', { style: styles.panelRowValue }, data.activeId || '—'),
          ),
          React.createElement('div', { style: styles.actions },
            React.createElement('button', {
              type: 'button',
              style: { ...styles.button, ...(poolEnabled ? styles.buttonDanger : styles.buttonPrimary) },
              disabled: busy !== null,
              onClick: () => toggle('enabled', poolEnabled, t('confirmDisablePool')),
            }, poolEnabled ? t('disablePool') : t('enablePool')),
            React.createElement('button', {
              type: 'button',
              style: { ...styles.button, ...(takeoverEnabled ? styles.buttonDanger : styles.buttonPrimary) },
              disabled: busy !== null,
              onClick: () => toggle('takeover', takeoverEnabled, t('confirmDisableTakeover')),
            }, takeoverEnabled ? t('disableTakeover') : t('enableTakeover')),
          ),
        ),
        React.createElement('div', { style: styles.panel },
          React.createElement('div', { style: styles.panelHead },
            React.createElement('h3', { style: styles.panelTitle }, t('switchHistory')),
            React.createElement('span', { style: styles.cardMeta }, t('recentSwitches').replace('{n}', String(history.length))),
          ),
          history.length === 0
            ? React.createElement('p', { style: styles.hint }, t('historyEmpty'))
            : history.map((item, index) => React.createElement('div', {
              key: `${item.at || index}:${item.from || ''}:${item.to || ''}`,
              style: index === history.length - 1 ? { ...styles.panelRow, ...styles.panelRowLast } : styles.panelRow,
            },
              React.createElement('span', { style: styles.panelRowLabel }, `${item.from || '—'} → ${item.to || '—'}`),
              React.createElement('span', { style: styles.panelRowValue }, `${switchReasonLabel(item, t)} · ${item.at ? new Date(item.at).toLocaleString() : '—'}`),
            )),
        ),
      );
    }

    function PoolPage(props) {
      const { t, api } = props;
      const [rootData, setRootData] = React.useState(null);
      const [providerId, setProviderId] = React.useState('opencode-go');
      const [activeSection, setActiveSection] = React.useState('switch');
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
      const rootRef = React.useRef(null);

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
      React.useEffect(() => {
        const root = rootRef.current;
        if (!root || typeof window === 'undefined') return;
        let node = root.parentElement;
        while (node && node !== document.body) {
          const computed = window.getComputedStyle(node);
          const scrollable = (computed.overflowY === 'auto' || computed.overflowY === 'scroll')
            && node.scrollHeight > node.clientHeight;
          if (scrollable) {
            node.scrollTop = 0;
            break;
          }
          node = node.parentElement;
        }
      }, [activeSection, selectedId]);

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

      const onSetRouting = (patch) => {
        runAction(async remote => remote.putConfig(selectedId, patch), null)
          .then(ok => {
            if (!ok) return;
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

      const keys = Array.isArray(data && data.keys) ? data.keys : [];

      return React.createElement('div', { ref: rootRef, className: 'dsh-ap-root', style: styles.wrap },
        React.createElement('div', { style: styles.header },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('div', { style: { color: 'var(--dsw-alias-state-business-primary)' } },
            React.createElement(GoMark, { size: 24 }),
          ),
          React.createElement('div', null,
            React.createElement('h2', { style: styles.title }, t('title')),
            React.createElement('p', { style: styles.subtitle }, t('subtitle')),
          ),
          ),
        ),
        React.createElement(ProviderContext, {
          providers,
          selectedId,
          selected,
          t,
          onChange: setProviderId,
        }),
        React.createElement('div', { className: 'dsh-ap-main-tabs', style: styles.sectionTabs, role: 'tablist', 'aria-label': t('title') },
          [
            ['switch', t('sectionOverview')],
            ['settings', t('settingsTitle')],
          ].map(([id, label]) => React.createElement('button', {
            key: id,
            type: 'button',
            role: 'tab',
            'aria-selected': id === 'switch' ? activeSection === 'switch' : activeSection !== 'switch',
            style: { ...styles.sectionTab, ...((id === 'switch' ? activeSection === 'switch' : activeSection !== 'switch') ? styles.sectionTabActive : {}) },
            onClick: () => setActiveSection(id === 'switch' ? 'switch' : (activeSection === 'switch' ? 'models' : activeSection)),
          }, label)),
        ),
        activeSection !== 'switch'
          ? React.createElement('div', null,
            React.createElement('div', { style: styles.settingsHeader },
              React.createElement('div', null,
                React.createElement('h3', { style: styles.settingsTitle }, t('settingsTitle')),
                React.createElement('p', { style: styles.settingsHint }, t('settingsHint')),
              ),
              React.createElement('button', { type: 'button', style: styles.button, onClick: () => setActiveSection('switch') }, t('backToSwitch')),
            ),
            React.createElement('div', { className: 'dsh-ap-settings-tabs', style: styles.sectionTabs, role: 'tablist', 'aria-label': t('settingsTitle') },
              [
                ['accounts', t('sectionAccounts')],
                ['models', t('sectionModels')],
                ['routing', t('sectionRouting')],
              ].map(([id, label]) => React.createElement('button', {
                key: id,
                type: 'button',
                role: 'tab',
                'aria-selected': activeSection === id,
                style: { ...styles.sectionTab, ...(activeSection === id ? styles.sectionTabActive : {}) },
                onClick: () => setActiveSection(id),
              }, label)),
            ),
          )
          : null,
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
            activeSection === 'switch'
              ? React.createElement(TakeoverStrip, { data, t, keys })
              : null,
            activeSection === 'switch'
              ? React.createElement(SwitchWorkspace, {
                data, t, keys, tick, busy, refreshing,
                onKeyAction,
                onNavigate: setActiveSection,
                onRefresh: load,
              })
              : activeSection === 'models'
                ? React.createElement(ModelCard, {
                  t, data, sel: modelSel, setSel: setModelSel, busy,
                  onSave: (patch, invalidMessage) => {
                    if (!patch) {
                      setNotice({ ok: false, text: `${t('saveFailed')}: ${invalidMessage}` });
                      return;
                    }
                    onSetModels(patch);
                  },
                })
                : activeSection === 'accounts'
                  ? React.createElement(React.Fragment, null,
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
                      : React.createElement('div', { style: styles.banner },
                        React.createElement('p', { style: { margin: 0, fontWeight: 600 } }, t('noKeysTitle')),
                        React.createElement('p', { style: styles.hint }, t('noKeysHint')),
                      ),
                    React.createElement('div', { className: 'dsh-ap-key-grid', style: styles.keyGrid },
                      keys.map(item => React.createElement(KeyCard, {
                        key: item.id, item, t, tick, busy,
                        onAction: onKeyAction,
                      })),
                    ),
                    draft === null
                      ? React.createElement('button', {
                        style: styles.button,
                        disabled: busy !== null,
                        onClick: () => setDraft(keys.map(k => ({ id: k.id, label: k.label, apiKeyEnv: k.apiKeyEnv, secret: '' }))),
                      }, t('manageTitle'))
                      : React.createElement(Editor, { draft, setDraft, t, busy, onSave: onSaveKeys, existingKeys: keys }),
                  )
                  : React.createElement(React.Fragment, null,
                    React.createElement(RoutingPanel, { data, t, busy, onSave: onSetRouting }),
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
                  ),
            notice
              ? React.createElement('p', { style: { ...styles.notice, ...(notice.ok ? styles.noticeOk : styles.noticeErr) } }, notice.text)
              : null,
            React.createElement('div', { style: styles.actions },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
                React.createElement('button', { style: styles.button, disabled: busy !== null || refreshing, onClick: load }, refreshing ? t('refreshing') : t('refresh')),
                activeSection === 'models'
                  ? React.createElement('button', { style: styles.button, disabled: busy !== null || refreshing, onClick: onRefreshModels }, t('refreshModels'))
                  : null,
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
      // Hide the shell's default gear icon on our nav row only, and make the
      // account-pool workspace collapse cleanly on narrower settings panes.
      style.textContent = `
        button:has(.dsh-ap-nav-mark) > svg { display: none; }
        .dsh-ap-provider-context { grid-template-columns: minmax(220px, 1fr) minmax(0, 1.6fr); }
        .dsh-ap-switch-layout { grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr); }
        .dsh-ap-switch-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .dsh-ap-overview-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .dsh-ap-overview-columns { grid-template-columns: minmax(0, 1.4fr) minmax(240px, .8fr); }
        .dsh-ap-model-workspace { grid-template-columns: 1fr; }
        .dsh-ap-key-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .VOzbGW_panel:has(.dsh-ap-root), [role="dialog"]:has(.dsh-ap-root) {
          height: min(860px, calc(100vh - 48px));
          max-height: calc(100vh - 48px);
          height: min(860px, calc(100dvh - 48px));
          max-height: calc(100dvh - 48px);
        }
        .VOzbGW_panel:has(.dsh-ap-root) .VOzbGW_options, [role="dialog"]:has(.dsh-ap-root) .VOzbGW_options {
          min-height: 0;
        }
        .dsh-ap-root { box-sizing: border-box; min-height: 100%; }
        @media (max-width: 980px) {
          .dsh-ap-provider-context { grid-template-columns: 1fr; }
          .dsh-ap-provider-context-meta { justify-content: flex-start; }
          .dsh-ap-switch-layout { grid-template-columns: 1fr; }
          .dsh-ap-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .dsh-ap-overview-columns { grid-template-columns: 1fr; }
          .dsh-ap-model-workspace { grid-template-columns: 1fr; }
          .dsh-ap-key-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .dsh-ap-provider-context { grid-template-columns: 1fr; }
          .dsh-ap-switch-stat-grid { grid-template-columns: 1fr; }
          .dsh-ap-provider-tabs { grid-template-columns: 1fr; }
          .dsh-ap-overview-grid { grid-template-columns: 1fr; }
          .dsh-ap-model-workspace { grid-template-columns: 1fr; }
          .dsh-ap-model-filter { position: static; }
          .dsh-ap-key-grid { grid-template-columns: 1fr; }
        }
      `;
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
