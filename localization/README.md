# Pokémon Showdown 简体中文资源

这个目录用于生成并维护客户端简体中文资源。Showdown 的英文 ID 和协议值保持不变，中文只用于显示和输入别名。当前生成顺序为：油猴脚本精确匹配、形态名称组合、PKHeX 按游戏内部编号补齐。

## 当前覆盖率审计

先将官方 Showdown 仓库放在 `upstream/pokemon-showdown`、PKHeX 放在 `upstream/PKHeX`，然后运行：

```bash
node scripts/audit-localization.mjs
```

结果写入 `localization/generated/`：

- `coverage.json`：分数据类型的覆盖率；
- `*.json`：已经能够从现有油猴脚本匹配的条目；
- `*.missing.json`：仍需从 PokéAPI、PKHeX 或人工校对补齐的条目；
- `userscript-dictionary.json`：从油猴脚本安全提取的原始直译词典。
- `catalog.zh-Hans.json`：以 Showdown 内部 ID 为键、可供客户端直接加载的名称总表。
- `description-dictionary.json`：从官方 `data/text` 的道具、招式、特性说明生成的英文说明到中文说明映射。
- `*-descriptions.json` / `*-descriptions.missing.json`：按 Showdown 内部 ID 归档的说明翻译和缺失说明，便于后续补齐。

名称人工校对项放在 `overrides.zh-Hans.json`，界面补充项放在 `ui-overrides.zh-Hans.json`；它们优先级高于其他来源，不直接修改上游数据。

报告同时统计全部历史数据和未标记 `isNonstandard` 的当前数据。UI 与动态战斗句式不在这份名称覆盖率中，后续单独审计。

## 生成客户端运行时

```bash
node scripts/audit-localization.mjs
node scripts/generate-client-localization.mjs
node --test test/localization.test.mjs
```

客户端运行时会自动提取直译词典、官方说明翻译、长描述前缀规则和战斗正则，并生成
`play.pokemonshowdown.com/js/localization-zh-hans.js`。它通过 Preact 渲染钩子和战报节点创建接口工作，
不使用全页面 `MutationObserver`。协议值、队伍导入导出值以及发送给服务器的 ID 始终保持英文。
