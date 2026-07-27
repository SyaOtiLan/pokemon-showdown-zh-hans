# Pokémon Showdown 简体中文客户端

这是一个可重复生成的 Pokémon Showdown 简体中文本地化层，不修改对战协议、队伍文本或 Showdown 内部英文 ID。用户可以用中文搜索宝可梦、招式、特性和道具，客户端仍向服务器发送官方英文 ID。

## 覆盖范围

- 当前官方宝可梦、招式、特性、道具、性格名称：100%；
- 主界面、队伍编辑器、搜索结果、招式说明、战斗日志和悬浮提示；
- 中文名称搜索；
- 玩家昵称、聊天消息和队伍导入导出原文受到保护；
- CAP、Pokéstar 等 Showdown 自创或非官方内容不作为覆盖目标。

名称以当前 Showdown 数据为基准，依次使用人工修正、原汉化脚本、形态组合和 PKHeX 简体中文列表补齐。运行时由脚本生成，因此上游更新后可以重新审计，而不是手工维护一张无法验证的大表。

## 构建

前置条件：Node.js 20+ 和 Git。首次运行可自动拉取三个上游仓库并应用客户端补丁：

```bash
npm run bootstrap
```

它会创建以下目录：

```text
upstream/pokemon-showdown
upstream/pokemon-showdown-client
upstream/PKHeX
```

执行：

```bash
npm run generate
npm test
npm run build:full
PS_SERVER_HOST=127.0.0.1 PS_SERVER_PORT=8000 npm run package
```

静态成品位于 `dist/client/`。Nginx 示例见 `deploy/nginx-pokemon-showdown-client.conf`。

## 更新策略

更新三个上游仓库后重新运行 `npm run build:full`。覆盖率测试只要发现任一当前官方分类低于 100% 就会失败；新增缺失项会出现在 `localization/generated/*.missing.json`，少量人工校对放在 `localization/overrides.zh-Hans.json`。

## 来源与许可

- Pokémon Showdown Client：AGPL-3.0；
- Pokémon Showdown server/data：MIT；
- PKHeX 中文文本：GPL-3.0；
- `PSChina Server Translation SV 1.7.2`：文件头标注 MIT，作者 AL、WyAK。

本项目包含对 AGPL 客户端的修改，整体发布应遵守 AGPL-3.0，并保留各数据来源署名。公开发布前建议再向原油猴作者确认其发布页条款与文件头 MIT 声明是否一致。
