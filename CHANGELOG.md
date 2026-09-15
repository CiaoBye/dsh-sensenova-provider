# Changelog

All notable changes to `@ciaobye/dsh-sensenova-provider` are recorded here.

This repository was repurposed from an earlier project. The SenseNova provider history starts at commit `c2140c3`; unrelated commits inherited from the old repository history are intentionally excluded.

## Maintenance rule

- Every future feature, fix, behavior change, compatibility change, or documentation change must update this file in the **same commit**.
- Release sections summarize user-visible changes.
- The commit log below records each SenseNova-era implementation commit so changes remain traceable before formal releases/tags exist.
- The changelog bootstrap commit is identified by subject instead of SHA because a Git commit cannot contain its own final SHA before that SHA exists.

## [Unreleased]

### Added

- `docs: establish changelog tracking`
  - Added `CHANGELOG.md` and backfilled the SenseNova-era history from `c2140c3` onward.
  - Added `CHANGELOG.md` to the package `files` list so release tarballs include the change history.
  - Established the rule that future repository changes update this changelog in the same commit.

---

## [0.4.0-alpha.1] - 2026-09-15

### Added

- Full Key Pool control surface in **Settings → SenseNova**.
- Runtime Key states: usable, missing credential, `401` disabled, `429` cooldown, cooldown expiry, and last-used Key.
- Manual runtime-state reset without restarting DSH.
- Preferred Key selection with automatic failover when the preferred Key is unavailable.
- Ordered **model → preferred Key** routing rules; the first matching rule wins and normal pool failover remains active.
- Model allowlist for narrowing the models shown by normal DSH model pickers without making hidden models unresolvable.
- Host-side Typert Remote endpoints for runtime status, state reset, and the live SenseNova model catalog.
- Credential UX showing configured state, credential source, writable/read-only state, replace, clear, show/hide staged secret, add, and remove.
- Per-field reset/unset semantics so user overrides can fall back to DSH composition/default values.
- Dedicated Token Plan section documenting the current quota-integration limitation.

### Changed

- SenseNova settings moved from a simple configuration form to a provider-management console.
- Host configuration now supports `activeKey`, `modelKeyRules`, and `visibleModels`.
- Key acquisition can start from a model-selected or user-selected preferred Key while retaining round-robin/failover behavior.
- Model discovery now maintains a full catalog while the normal model list respects `visibleModels`.
- Package version bumped to `0.4.0-alpha.1`.

### Safety / provider integration

- No private SenseNova console endpoint is scraped for quota data.
- No credits, balance, or 5-hour-window values are fabricated when SenseNova does not expose a stable public account-quota API.
- Raw API keys remain in DSH Credentials / launch environment resolution and are never returned by runtime status APIs.

### Validation

- `npm run check` passed.
- `npm test` passed: 11/11 tests.
- `npm pack` passed.

### Commits

- `4c761ae` — `feat: add full SenseNova key pool and routing controls`
  - Added Key Pool runtime status and reset Remote.
  - Added preferred-Key routing, model-to-Key rules, model allowlist, credential controls, field reset semantics, and the new provider-management UI.
  - Added/updated tests and package metadata for `0.4.0-alpha.1`.

---

## [0.3.0-alpha.2] - 2026-09-15

### Changed

- Reworked the SenseNova settings layout to match DSH / Command Code visual rhythm more closely.
- Changed the API Key area from a cramped three-column layout to a vertical form layout.
- Changed Advanced settings from a two-column grid to a single-column settings flow.
- Aligned content width, title sizing, card padding, field spacing, buttons, and responsive behavior with DSH settings conventions.
- Package version bumped to `0.3.0-alpha.2`.

### Commits

- `05e34ed` — `fix: align SenseNova settings layout with DSH`
  - Corrected card/field spacing and the API Key layout that could force action labels into vertical text.
- `30829cb` — `chore: bump SenseNova provider to 0.3.0-alpha.2`
  - Published the layout revision as `0.3.0-alpha.2`.

---

## [0.3.0-alpha.1] - 2026-09-15

### Added

- Browser-side DSH client plugin for SenseNova.
- Dedicated **SenseNova** entry in the Settings sidebar using `settings.section`.
- Visual editing of API endpoint, multiple API Keys, 429 cooldowns, connection timeout, stream idle timeout, and default context window.
- DSH Credentials integration so API Keys are write-only from the browser and not stored in `settings.yaml`.
- Custom Models-page provider-card integration so users are directed to the dedicated SenseNova settings surface instead of the generic “edit settings.yaml” fallback.
- Chinese and English settings copy.
- Browser bundle registration smoke tests.

### Changed

- Package metadata gained the web client export/injection declarations required by DSH.
- README documented the new settings workflow.

### Commits

- `33d89e8` — `feat: add SenseNova web settings client`
  - Added the first Browser Client and dedicated SenseNova settings page.
- `9695cfa` — `feat: wire SenseNova web client metadata`
  - Added package client export/injection metadata and the `0.3.0-alpha.1` package wiring.
- `5ea7bb4` — `docs: document the SenseNova settings page`
  - Updated README for the new UI-based configuration flow.
- `69eed0b` — `test: cover SenseNova client registration`
  - Added tests for `settings.section`, Models provider-card registration, and published client metadata.

---

## [0.2.0-alpha.1] - 2026-09-15

### Added

- Initial SenseNova provider rewrite for DeepSeek Harness `0.1.6-alpha.1`.
- OpenAI-compatible `/models` and `/chat/completions` integration.
- Multi-Key round-robin pool using logical credential references rather than storing raw keys in pool state.
- `401` handling that disables the rejected Key for the current plugin lifecycle and immediately tries another usable Key.
- `429` handling with `Retry-After`, SenseNova error-code-aware cooldown floors, configurable default/max cooldown, and automatic failover.
- DSH retry-policy integration using the pool’s earliest cooldown as provider retry timing.
- Connect/first-byte timeout and stream idle timeout handling while preserving host cancellation after headers arrive.
- Tool Call streaming repair for SenseNova continuation chunks that send empty `id` / `function.name` values.
- Historical Tool Call sanitization for broken IDs, empty arguments, empty names, and orphan tool results.
- DSH `0.1.6` stream ordering compliance: block end → usage → finish, with nothing emitted after finish.
- Model catalog parsing with context/output metadata and known reasoning-effort fallbacks.
- Initial unit tests for pool behavior and streamed Tool Call handling.

### Changed

- README was reduced from implementation notes to an open-source project landing page focused on purpose, installation, configuration, and 401/429 behavior.
- DSH compatibility metadata was added so compatibility checkers no longer report the package as `UNKNOWN`.

### Commits

- `c2140c3` — `feat: add DSH 0.1.6 SenseNova provider`
  - Initial standalone SenseNova provider implementation and tests.
- `1355c71` — `docs: simplify README`
  - Rewrote the README around the primary user workflow and core features.
- `c1c50fc` — `chore: declare DSH compatibility metadata`
  - Added explicit DSH compatibility metadata for the `0.1.6` line.

---

[Unreleased]: https://github.com/CiaoBye/dsh-sensenova-provider/compare/main...HEAD
[0.4.0-alpha.1]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/4c761aef5432abd36c21aedc17b9872b3fbed818
[0.3.0-alpha.2]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/30829cb764dc91ab75e67edeb5537c86e60b2e4e
[0.3.0-alpha.1]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/69eed0b63764ab3a32b805a3b013e49d6a640dcb
[0.2.0-alpha.1]: https://github.com/CiaoBye/dsh-sensenova-provider/commit/c1c50fcafc992554e4ed99183414e3b28e87e40b
