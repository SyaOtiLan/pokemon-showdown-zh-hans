# Pokémon Showdown 简体中文客户端

这是一个可重复生成的 Pokémon Showdown 简体中文本地化层，不修改对战协议、队伍文本或 Showdown 内部英文 ID。用户可以用中文搜索宝可梦、招式、特性和道具，客户端仍向服务器发送官方英文 ID。

## 普通玩家直接安装

不需要自己的服务器。安装 Tampermonkey、Violentmonkey 或 ScriptCat 后，从以下任一渠道安装，即可在 Pokémon Showdown 官方站使用中文界面、中文战报和中文名称搜索：

- [Greasy Fork 一键安装](https://greasyfork.org/scripts/588764/code.user.js)（[发布页与反馈](https://greasyfork.org/zh-CN/scripts/588764-pok%C3%A9mon-showdown-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87)）
- [ScriptCat 一键安装](https://scriptcat.org/scripts/code/7194/Pok%C3%A9mon%20Showdown%20%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87.user.js)（[发布页](https://scriptcat.org/zh-CN/script-show-page/7194)）
- [GitHub 成品脚本](https://raw.githubusercontent.com/SyaOtiLan/pokemon-showdown-zh-hans/main/release/pokemon-showdown-zh-hans.user.js)（备用入口）

自建客户端和服务器只是服主选项，不是普通玩家使用汉化的前置条件。

| 发行方式 | 面向用户 | 是否需要自建服务器 | 功能 |
| --- | --- | --- | --- |
| `.user.js` | 普通玩家 | 否 | 官方站/常见服务器汉化、战报、中文搜索 |
| 集成客户端 | 服主 | 是 | 源码级集成、独立部署、可指定私服 |

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

默认以私服昵称模式运行，不依赖 Showdown 官方登录站。若服务器能够访问官方登录服务并且已经正确注册，可额外设置 `PS_SERVER_REGISTERED=true`。

私服昵称模式不设置密码：用户输入昵称后由本机 Showdown 服务直接接纳。队伍、偏好和会话数据保存在用户自己的浏览器存储中，服务端日志及对战数据保存在 VPS；不会上传到本项目或额外的第三方数据库。昵称不具备所有权保护，因此只适合受信任的小范围私服。

私服昵称模式下，账号状态、登录注册、远程队伍、个人 rating、天梯列表、客户端素材、推荐配招和回放下载均使用本地路径；不支持官方账号注册、密码修改和在线回放上传。Nginx 示例还会立即拦截旧缓存客户端误发到 `/~~showdown/action.php` 的请求，避免 VPS 因无法连接官方登录站而长时间等待。Smogon 资料链接和 Poképaste 导入仍是用户主动触发的外部功能。

## 更新策略

更新三个上游仓库后重新运行 `npm run build:full`。覆盖率测试只要发现任一当前官方分类低于 100% 就会失败；新增缺失项会出现在 `localization/generated/*.missing.json`，少量人工校对放在 `localization/overrides.zh-Hans.json`。

`npm run generate` 同时生成集成客户端运行时和普通玩家使用的 `.user.js`。推送 `v*` 标签时，GitHub Actions 会自动校验并把油猴脚本附加到 Release。

## 来源与许可

- Pokémon Showdown Client：AGPL-3.0；
- Pokémon Showdown server/data：MIT；
- PKHeX 中文文本：GPL-3.0；
- `PSChina Server Translation SV 1.7.2`：文件头标注 MIT，作者 AL、WyAK。

本项目包含对 AGPL 客户端的修改，整体发布应遵守 AGPL-3.0，并保留各数据来源署名。公开发布前建议再向原油猴作者确认其发布页条款与文件头 MIT 声明是否一致。
