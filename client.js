window.__ModuleLoader__.load({
  id: "@ciaobye/dsh-sensenova-provider",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;

    const NS = "llm-sensenova";
    const LOCALE_NS = "settings.sensenova";
    const DEFAULT_API_BASE = "https://token.sensenova.cn/v1";
    const DEFAULT_REF = "SENSENOVA_API_KEY";

    const zh = {
      nav: "SenseNova",
      title: "SenseNova",
      intro: "配置 SenseNova API、多 Key 轮转与限流策略。API Key 仅写入 DSH Credentials，不会保存在 settings.yaml。",
      loading: "正在读取 SenseNova 配置…",
      unavailable: "SenseNova 配置当前不可用。请确认 Host 端 llm-sensenova 插件已启用。",
      readOnly: "当前设置文档为只读，无法保存修改。",
      connection: "连接",
      apiBase: "API Endpoint",
      apiBaseHint: "默认使用 SenseNova OpenAI-compatible API。",
      keys: "API Keys",
      keysHint: "请求会在可用 Key 之间轮转；401 会禁用当前 Key，429 会让当前 Key 暂时冷却。",
      keyLabel: "名称",
      keySecret: "API Key",
      stored: "已保存",
      notStored: "未保存",
      storedHint: "已配置；留空会保留现有 Key",
      emptyHint: "输入 API Key 后保存",
      clearKey: "清除密钥",
      undoClear: "撤销清除",
      removeKey: "删除",
      addKey: "+ 添加 Key",
      advanced: "高级设置",
      cooldown429Ms: "429 默认冷却",
      maxCooldown429Ms: "429 最大冷却",
      connectTimeoutMs: "连接超时",
      streamIdleTimeoutMs: "流空闲超时",
      defaultContextWindow: "默认 Context Window",
      milliseconds: "毫秒",
      contextTokens: "tokens",
      save: "保存",
      saving: "保存中…",
      cancel: "取消",
      saved: "已保存",
      saveFailed: "保存失败",
      invalid: "请检查输入值。所有数值必须为正数，且最大冷却时间不能小于默认冷却时间。",
      needKey: "至少保留一个 Key 槽位。",
      modelsHint: "完整配置请使用左侧的 SenseNova 设置页。",
      modelsConfigured: "SenseNova 已配置",
      modelsPending: "SenseNova 尚未保存 API Key"
    };

    const en = {
      nav: "SenseNova",
      title: "SenseNova",
      intro: "Configure the SenseNova API, multi-key rotation, and rate-limit behavior. API keys are stored only in DSH Credentials, never in settings.yaml.",
      loading: "Loading SenseNova settings…",
      unavailable: "SenseNova settings are unavailable. Make sure the Host-side llm-sensenova plugin is enabled.",
      readOnly: "The settings document is read-only.",
      connection: "Connection",
      apiBase: "API Endpoint",
      apiBaseHint: "Uses the SenseNova OpenAI-compatible API by default.",
      keys: "API Keys",
      keysHint: "Requests rotate across usable keys; 401 disables a key and 429 temporarily cools it down.",
      keyLabel: "Label",
      keySecret: "API Key",
      stored: "Stored",
      notStored: "Not stored",
      storedHint: "Configured; leave blank to keep the current key",
      emptyHint: "Enter an API key and save",
      clearKey: "Clear key",
      undoClear: "Undo clear",
      removeKey: "Remove",
      addKey: "+ Add key",
      advanced: "Advanced",
      cooldown429Ms: "Default 429 cooldown",
      maxCooldown429Ms: "Maximum 429 cooldown",
      connectTimeoutMs: "Connect timeout",
      streamIdleTimeoutMs: "Stream idle timeout",
      defaultContextWindow: "Default context window",
      milliseconds: "ms",
      contextTokens: "tokens",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      saved: "Saved",
      saveFailed: "Save failed",
      invalid: "Check the inputs. Numeric values must be positive and the maximum cooldown cannot be below the default cooldown.",
      needKey: "Keep at least one key slot.",
      modelsHint: "Use the dedicated SenseNova item in the Settings sidebar for full configuration.",
      modelsConfigured: "SenseNova configured",
      modelsPending: "No stored SenseNova API key"
    };

    const DEFAULTS = {
      apiBase: DEFAULT_API_BASE,
      cooldown429Ms: 30000,
      maxCooldown429Ms: 120000,
      connectTimeoutMs: 45000,
      streamIdleTimeoutMs: 60000,
      defaultContextWindow: 131072,
    };

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function normalizeKey(entry, index) {
      const id = typeof entry?.id === "string" && entry.id.trim() ? entry.id.trim() : `key-${index + 1}`;
      const label = typeof entry?.label === "string" && entry.label.trim() ? entry.label.trim() : id;
      const ref = typeof entry?.apiKeyEnv === "string" && entry.apiKeyEnv.trim()
        ? entry.apiKeyEnv.trim()
        : (index === 0 ? DEFAULT_REF : `${DEFAULT_REF}_${index + 1}`);
      return { id, label, ref, keyText: "", configured: false, clearStaged: false };
    }

    function normalizeConfig(value) {
      const raw = value && typeof value === "object" ? value : {};
      const sourceKeys = Array.isArray(raw.keys) && raw.keys.length ? raw.keys : [{ id: "default", label: "Default", apiKeyEnv: DEFAULT_REF }];
      return {
        apiBase: typeof raw.apiBase === "string" && raw.apiBase.trim() ? raw.apiBase : DEFAULTS.apiBase,
        keys: sourceKeys.map(normalizeKey),
        cooldown429Ms: String(Number.isFinite(raw.cooldown429Ms) ? raw.cooldown429Ms : DEFAULTS.cooldown429Ms),
        maxCooldown429Ms: String(Number.isFinite(raw.maxCooldown429Ms) ? raw.maxCooldown429Ms : DEFAULTS.maxCooldown429Ms),
        connectTimeoutMs: String(Number.isFinite(raw.connectTimeoutMs) ? raw.connectTimeoutMs : DEFAULTS.connectTimeoutMs),
        streamIdleTimeoutMs: String(Number.isFinite(raw.streamIdleTimeoutMs) ? raw.streamIdleTimeoutMs : DEFAULTS.streamIdleTimeoutMs),
        defaultContextWindow: String(Number.isFinite(raw.defaultContextWindow) ? raw.defaultContextWindow : DEFAULTS.defaultContextWindow),
      };
    }

    function configFingerprint(config) {
      return JSON.stringify({
        apiBase: config.apiBase,
        keys: config.keys.map((key) => ({ id: key.id, label: key.label, apiKeyEnv: key.ref })),
        cooldown429Ms: Number(config.cooldown429Ms),
        maxCooldown429Ms: Number(config.maxCooldown429Ms),
        connectTimeoutMs: Number(config.connectTimeoutMs),
        streamIdleTimeoutMs: Number(config.streamIdleTimeoutMs),
        defaultContextWindow: Number(config.defaultContextWindow),
      });
    }

    class SenseNovaSettingsController {
      constructor(scope, credentials) {
        this.scope = scope;
        this.credentials = credentials;
        this.listeners = new Set();
        this.baseline = normalizeConfig(undefined);
        this.draft = clone(this.baseline);
        this.status = "loading";
        this.writable = false;
        this.saving = false;
        this.failed = false;
        this.errorKind = undefined;
        this.savedCount = 0;
        this.credentialEpoch = 0;
        this.disposed = false;
        this.scopeDispose = scope.subscribe(() => this.acceptScope());
        this.acceptScope(true);
      }

      dispose() {
        this.disposed = true;
        this.scopeDispose?.();
        this.listeners.clear();
      }

      subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      }

      emit() {
        for (const listener of this.listeners) {
          try { listener(); } catch (error) { console.error("[dsh-sensenova-provider] settings subscriber failed:", error); }
        }
      }

      isDirty() {
        if (configFingerprint(this.draft) !== configFingerprint(this.baseline)) return true;
        return this.draft.keys.some((key) => key.keyText.trim() !== "" || key.clearStaged);
      }

      isValid() {
        if (!this.draft.apiBase.trim() || this.draft.keys.length < 1) return false;
        const ids = new Set();
        const refs = new Set();
        for (const key of this.draft.keys) {
          if (!key.id.trim() || !key.label.trim() || !key.ref.trim()) return false;
          if (ids.has(key.id) || refs.has(key.ref)) return false;
          ids.add(key.id);
          refs.add(key.ref);
        }
        const numeric = ["cooldown429Ms", "maxCooldown429Ms", "connectTimeoutMs", "streamIdleTimeoutMs", "defaultContextWindow"];
        for (const field of numeric) {
          const value = Number(this.draft[field]);
          if (!Number.isFinite(value) || value <= 0) return false;
        }
        return Number(this.draft.maxCooldown429Ms) >= Number(this.draft.cooldown429Ms);
      }

      snapshot() {
        return {
          available: this.status === "ready",
          loading: this.status === "loading",
          writable: this.writable,
          saving: this.saving,
          failed: this.failed,
          errorKind: this.errorKind,
          savedCount: this.savedCount,
          dirty: this.isDirty(),
          valid: this.isValid(),
          ...clone(this.draft),
        };
      }

      acceptScope(force = false) {
        const snap = this.scope.getSnapshot();
        this.status = snap.status;
        this.writable = Boolean(snap.writable);
        if (snap.status === "ready" && (force || (!this.isDirty() && !this.saving))) {
          this.baseline = normalizeConfig(snap.value);
          this.draft = clone(this.baseline);
          this.failed = false;
          this.errorKind = undefined;
          this.refreshCredentials();
        }
        this.emit();
      }

      async refreshCredentials() {
        const epoch = ++this.credentialEpoch;
        const refs = this.draft.keys.map((key) => key.ref).filter(Boolean);
        if (!refs.length || !this.credentials || typeof this.credentials.describe !== "function") return;
        try {
          const response = await this.credentials.describe(refs);
          if (this.disposed || epoch !== this.credentialEpoch || !response?.ok) return;
          const facts = response.value || {};
          for (const key of this.draft.keys) key.configured = Boolean(facts[key.ref]?.configured);
          for (const key of this.baseline.keys) key.configured = Boolean(facts[key.ref]?.configured);
          this.emit();
        } catch (error) {
          console.error("[dsh-sensenova-provider] could not describe credentials:", error);
        }
      }

      edit(field, value) {
        if (!(field in this.draft)) return;
        this.draft[field] = value;
        this.failed = false;
        this.errorKind = undefined;
        this.emit();
      }

      editKey(id, field, value) {
        const key = this.draft.keys.find((item) => item.id === id);
        if (!key) return;
        if (field === "label" || field === "keyText") key[field] = value;
        this.failed = false;
        this.errorKind = undefined;
        this.emit();
      }

      toggleClear(id) {
        const key = this.draft.keys.find((item) => item.id === id);
        if (!key) return;
        key.clearStaged = !key.clearStaged;
        if (key.clearStaged) key.keyText = "";
        this.emit();
      }

      addKey() {
        const ids = new Set(this.draft.keys.map((key) => key.id));
        const refs = new Set(this.draft.keys.map((key) => key.ref));
        let n = 2;
        while (ids.has(`sn-${n}`) || refs.has(`${DEFAULT_REF}_${n}`)) n += 1;
        this.draft.keys.push({
          id: `sn-${n}`,
          label: `SenseNova ${n}`,
          ref: `${DEFAULT_REF}_${n}`,
          keyText: "",
          configured: false,
          clearStaged: false,
        });
        this.emit();
      }

      removeKey(id) {
        if (this.draft.keys.length <= 1) {
          this.errorKind = "needKey";
          this.emit();
          return;
        }
        this.draft.keys = this.draft.keys.filter((key) => key.id !== id);
        this.failed = false;
        this.errorKind = undefined;
        this.emit();
      }

      discard() {
        this.draft = clone(this.baseline);
        this.failed = false;
        this.errorKind = undefined;
        this.refreshCredentials();
        this.emit();
      }

      async save() {
        if (this.saving || !this.writable) return;
        if (!this.isValid()) {
          this.failed = true;
          this.errorKind = "invalid";
          this.emit();
          return;
        }
        this.saving = true;
        this.failed = false;
        this.errorKind = undefined;
        this.emit();
        try {
          const normalized = {
            apiBase: this.draft.apiBase.trim().replace(/\/+$/, ""),
            keys: this.draft.keys.map((key) => ({ id: key.id.trim(), label: key.label.trim(), apiKeyEnv: key.ref.trim() })),
            cooldown429Ms: Math.floor(Number(this.draft.cooldown429Ms)),
            maxCooldown429Ms: Math.floor(Number(this.draft.maxCooldown429Ms)),
            connectTimeoutMs: Math.floor(Number(this.draft.connectTimeoutMs)),
            streamIdleTimeoutMs: Math.floor(Number(this.draft.streamIdleTimeoutMs)),
            defaultContextWindow: Math.floor(Number(this.draft.defaultContextWindow)),
          };
          const baselineNormalized = {
            apiBase: this.baseline.apiBase.trim().replace(/\/+$/, ""),
            keys: this.baseline.keys.map((key) => ({ id: key.id, label: key.label, apiKeyEnv: key.ref })),
            cooldown429Ms: Math.floor(Number(this.baseline.cooldown429Ms)),
            maxCooldown429Ms: Math.floor(Number(this.baseline.maxCooldown429Ms)),
            connectTimeoutMs: Math.floor(Number(this.baseline.connectTimeoutMs)),
            streamIdleTimeoutMs: Math.floor(Number(this.baseline.streamIdleTimeoutMs)),
            defaultContextWindow: Math.floor(Number(this.baseline.defaultContextWindow)),
          };
          const ops = [];
          for (const field of Object.keys(normalized)) {
            if (JSON.stringify(normalized[field]) !== JSON.stringify(baselineNormalized[field])) {
              ops.push({ op: "set", path: [field], value: normalized[field] });
            }
          }
          if (ops.length) await this.scope.mutate(ops);

          if (this.credentials) {
            for (const key of this.draft.keys) {
              if (key.clearStaged && typeof this.credentials.unset === "function") {
                const response = await this.credentials.unset(key.ref);
                if (response && response.ok === false) throw new Error(response.error?.message || `could not clear ${key.ref}`);
              } else if (key.keyText.trim() && typeof this.credentials.set === "function") {
                const response = await this.credentials.set(key.ref, key.keyText.trim());
                if (response && response.ok === false) throw new Error(response.error?.message || `could not store ${key.ref}`);
              }
            }
          }

          this.baseline = normalizeConfig({ ...normalized });
          this.draft = clone(this.baseline);
          this.savedCount += 1;
          this.failed = false;
          this.errorKind = undefined;
          await this.refreshCredentials();
        } catch (error) {
          console.error("[dsh-sensenova-provider] save failed:", error);
          this.failed = true;
          this.errorKind = "saveFailed";
        } finally {
          this.saving = false;
          this.emit();
        }
      }
    }

    function createStore(controller) {
      let snapshot = controller.snapshot();
      const listeners = new Set();
      const dispose = controller.subscribe(() => {
        snapshot = controller.snapshot();
        for (const listener of listeners) listener();
      });
      return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        dispose,
      };
    }

    const PAGE_CSS = `
.sn-section{max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px}
.sn-title{margin:0;font-size:20px;font-weight:650}.sn-intro,.sn-hint,.sn-meta{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.55}
.sn-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.sn-cardHead{display:flex;align-items:center;gap:8px}.sn-cardTitle{margin:0;flex:1;font-size:14px;font-weight:600}.sn-badge{font-size:11px;line-height:18px;padding:0 8px;border-radius:999px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}
.sn-field{display:flex;flex-direction:column;gap:6px}.sn-label{font-size:13px;font-weight:500}.sn-input{height:34px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 11px;font:inherit;font-size:13px;box-sizing:border-box}.sn-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}.sn-input:disabled{opacity:.55}
.sn-key{border-top:1px solid var(--dsw-alias-border-l2);padding-top:12px;display:grid;grid-template-columns:minmax(150px,1fr) minmax(220px,1.6fr) auto;gap:10px;align-items:end}.sn-key:first-of-type{border-top:0;padding-top:0}.sn-keyActions{display:flex;gap:8px;align-items:center;padding-bottom:1px}
.sn-btn{height:32px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 12px;font:inherit;font-size:12px;cursor:pointer}.sn-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}.sn-btn:disabled{cursor:default;opacity:.45}.sn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}.sn-danger{color:var(--dsw-alias-label-error)}
.sn-advancedHead{width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:0}.sn-caret{margin-left:auto;width:7px;height:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg)}.sn-caretUp{transform:rotate(-135deg)}
.sn-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sn-footer{display:flex;justify-content:flex-end;align-items:center;gap:8px}.sn-error{margin:0;color:var(--dsw-alias-label-error);font-size:12px;line-height:1.5;flex:1}.sn-ok{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5;flex:1}
.sn-modelCard{padding:10px 0;display:flex;align-items:center;gap:8px}.sn-modelCardText{font-size:12px;color:var(--dsw-alias-label-secondary)}
@media(max-width:700px){.sn-key{grid-template-columns:1fr}.sn-keyActions{padding-bottom:0}.sn-grid{grid-template-columns:1fr}}
`;

    function injectCss() {
      if (document.getElementById("dsh-sensenova-provider-style")) return () => {};
      const style = document.createElement("style");
      style.id = "dsh-sensenova-provider-style";
      style.textContent = PAGE_CSS;
      document.head.appendChild(style);
      return () => style.remove();
    }

    function Field({ label, value, onChange, disabled, type = "text", hint }) {
      return h("label", { className: "sn-field" },
        h("span", { className: "sn-label" }, label),
        h("input", { className: "sn-input", type, value, disabled, autoComplete: type === "password" ? "off" : undefined, spellCheck: false, onChange: (event) => onChange(event.target.value) }),
        hint ? h("span", { className: "sn-hint" }, hint) : null,
      );
    }

    function SenseNovaSettingsPage(props) {
      const state = props.useSenseNovaSettings((value) => value);
      const t = props.t;
      const [advanced, setAdvanced] = React.useState(false);

      if (state.loading) return h("div", { className: "sn-section" }, h("p", { className: "sn-hint" }, t("loading")));
      if (!state.available) return h("div", { className: "sn-section" }, h("p", { className: "sn-error" }, t("unavailable")));
      const disabled = !state.writable || state.saving;
      const errorText = state.errorKind ? t(state.errorKind) : (!state.valid && state.dirty ? t("invalid") : "");
      const savedVisible = state.savedCount > 0 && !state.dirty && !state.failed;

      return h("div", { className: "sn-section" },
        h("div", null,
          h("h2", { className: "sn-title" }, t("title")),
          h("p", { className: "sn-intro" }, t("intro")),
        ),
        !state.writable ? h("p", { className: "sn-error" }, t("readOnly")) : null,
        h("section", { className: "sn-card" },
          h("div", { className: "sn-cardHead" }, h("h3", { className: "sn-cardTitle" }, t("connection"))),
          h(Field, { label: t("apiBase"), value: state.apiBase, onChange: (value) => props.edit("apiBase", value), disabled, hint: t("apiBaseHint") }),
        ),
        h("section", { className: "sn-card" },
          h("div", { className: "sn-cardHead" }, h("h3", { className: "sn-cardTitle" }, t("keys")), h("span", { className: "sn-badge" }, `${state.keys.filter((key) => key.configured && !key.clearStaged).length}/${state.keys.length}`)),
          h("p", { className: "sn-hint" }, t("keysHint")),
          ...state.keys.map((key) => h("div", { className: "sn-key", key: key.id },
            h(Field, { label: t("keyLabel"), value: key.label, onChange: (value) => props.editKey(key.id, "label", value), disabled }),
            h(Field, { label: `${t("keySecret")} · ${key.ref}`, value: key.keyText, onChange: (value) => props.editKey(key.id, "keyText", value), disabled: disabled || key.clearStaged, type: "password", hint: key.configured ? t("storedHint") : t("emptyHint") }),
            h("div", { className: "sn-keyActions" },
              h("span", { className: "sn-badge" }, key.clearStaged ? t("notStored") : (key.configured ? t("stored") : t("notStored"))),
              key.configured ? h("button", { className: "sn-btn", type: "button", disabled, onClick: () => props.toggleClear(key.id) }, key.clearStaged ? t("undoClear") : t("clearKey")) : null,
              h("button", { className: "sn-btn sn-danger", type: "button", disabled: disabled || state.keys.length <= 1, onClick: () => props.removeKey(key.id) }, t("removeKey")),
            ),
          )),
          h("div", null, h("button", { className: "sn-btn", type: "button", disabled, onClick: props.addKey }, t("addKey"))),
        ),
        h("section", { className: "sn-card" },
          h("button", { className: "sn-advancedHead", type: "button", "aria-expanded": advanced, onClick: () => setAdvanced((value) => !value) },
            t("advanced"), h("span", { className: advanced ? "sn-caret sn-caretUp" : "sn-caret", "aria-hidden": true })),
          advanced ? h("div", { className: "sn-grid" },
            h(Field, { label: t("cooldown429Ms"), value: state.cooldown429Ms, onChange: (value) => props.edit("cooldown429Ms", value), disabled, hint: t("milliseconds") }),
            h(Field, { label: t("maxCooldown429Ms"), value: state.maxCooldown429Ms, onChange: (value) => props.edit("maxCooldown429Ms", value), disabled, hint: t("milliseconds") }),
            h(Field, { label: t("connectTimeoutMs"), value: state.connectTimeoutMs, onChange: (value) => props.edit("connectTimeoutMs", value), disabled, hint: t("milliseconds") }),
            h(Field, { label: t("streamIdleTimeoutMs"), value: state.streamIdleTimeoutMs, onChange: (value) => props.edit("streamIdleTimeoutMs", value), disabled, hint: t("milliseconds") }),
            h(Field, { label: t("defaultContextWindow"), value: state.defaultContextWindow, onChange: (value) => props.edit("defaultContextWindow", value), disabled, hint: t("contextTokens") }),
          ) : null,
        ),
        h("div", { className: "sn-footer" },
          errorText ? h("p", { className: "sn-error" }, errorText) : (savedVisible ? h("p", { className: "sn-ok" }, t("saved")) : h("span", { style: { flex: 1 } })),
          h("button", { className: "sn-btn", type: "button", disabled: disabled || !state.dirty, onClick: props.discard }, t("cancel")),
          h("button", { className: "sn-btn sn-primary", type: "button", disabled: disabled || !state.dirty || !state.valid, onClick: props.save }, state.saving ? t("saving") : t("save")),
        ),
      );
    }

    function adjacentEditorCard(wrapper) {
      if (!wrapper) return null;
      for (const sibling of [wrapper.previousElementSibling, wrapper.nextElementSibling]) {
        if (sibling && typeof sibling.className === "string" && sibling.className.includes("editor")) return sibling;
      }
      return null;
    }

    function SenseNovaProviderCard(props) {
      const state = props.useSenseNovaSettings((value) => value);
      const configured = state.keys?.some((key) => key.configured && !key.clearStaged);
      const rootRef = React.useRef(null);
      const [editorOpen, setEditorOpen] = React.useState(false);
      React.useEffect(() => {
        const root = rootRef.current;
        if (!root || typeof MutationObserver === "undefined") return;
        const wrapper = root.closest('[data-slot="settings.models.provider-card"]') || root.parentElement;
        const row = wrapper?.parentElement;
        if (!wrapper || !row) return;
        let hiddenEditor = null;
        const sync = () => {
          const editor = adjacentEditorCard(wrapper);
          setEditorOpen(Boolean(editor));
          if (editor) {
            editor.style.display = "none";
            hiddenEditor = editor;
          }
        };
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(row, { childList: true });
        return () => {
          observer.disconnect();
          if (hiddenEditor) hiddenEditor.style.display = "";
        };
      }, []);
      return h("div", {
        ref: rootRef,
        className: "sn-modelCard",
        style: editorOpen ? undefined : { display: "none" },
      },
        editorOpen ? h("span", { className: "sn-badge" }, configured ? props.t("modelsConfigured") : props.t("modelsPending")) : null,
        editorOpen ? h("span", { className: "sn-modelCardText" }, props.t("modelsHint")) : null,
      );
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), "dsh-sensenova-provider: locale");
      ctx.effect(() => injectCss(), "dsh-sensenova-provider: styles");

      const scope = ctx.settingsScope.bind({ namespace: NS });
      const controller = new SenseNovaSettingsController(scope, ctx.remote.credentials);
      const store = createStore(controller);
      ctx.effect(() => () => { store.dispose(); controller.dispose(); }, "dsh-sensenova-provider: settings controller");

      if (ctx.remote?.$on) {
        ctx.effect(() => ctx.remote.$on("credentials/reference-updated", () => controller.refreshCredentials()), "dsh-sensenova-provider: credential invalidations");
      }

      const injected = () => ({
        hooks: { senseNovaSettings: store },
        edit: (field, value) => controller.edit(field, value),
        editKey: (id, field, value) => controller.editKey(id, field, value),
        toggleClear: (id) => controller.toggleClear(id),
        addKey: () => controller.addKey(),
        removeKey: (id) => controller.removeKey(id),
        discard: () => controller.discard(),
        save: () => void controller.save(),
      });

      const t = ctx.locale.bind(LOCALE_NS);
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "sensenova",
        order: 13,
        label: () => t("nav"),
        locale: LOCALE_NS,
        inject: injected,
      }, SenseNovaSettingsPage));

      ctx.slots.inject("settings.models.provider-card", () => ctx.slots.register({
        name: "settings.models.provider-card",
        key: NS,
        locale: LOCALE_NS,
        inject: injected,
      }, SenseNovaProviderCard));
    }

    const inject = ["slots", "locale", "remote", "remote.credentials", "settingsScope"];

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
