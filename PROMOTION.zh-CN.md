# Pokémon Showdown 简体中文宣传文案

## 推荐标题

Pokémon Showdown 简体中文脚本：支持直接用中文组队搜索

## 简短版本（QQ群、朋友圈、动态）

做了一个 Pokémon Showdown 简体中文脚本，可以直接在官方 PS 使用，不需要进入私服。

除了界面和战报汉化，还支持在队伍编辑器里用中文搜索宝可梦、招式、特性和道具，例如“皮卡丘”“十万伏特”“避雷针”“讲究围巾”。中文只用于显示和搜索，不修改对战规则、队伍格式或 Showdown 的英文 ID。

- Greasy Fork：https://greasyfork.org/zh-CN/scripts/588764-pok%C3%A9mon-showdown-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87
- ScriptCat：https://scriptcat.org/zh-CN/script-show-page/7194
- GitHub：https://github.com/SyaOtiLan/pokemon-showdown-zh-hans

目前仍可能有少量新版页面或最新内容显示英文，发现漏译或误译欢迎在 GitHub 提 Issue。

## 详细版本（论坛、贴吧、专栏）

最近整理并发布了一个 Pokémon Showdown 简体中文用户脚本。

它可以直接安装在 Tampermonkey、Violentmonkey 或 ScriptCat 中，在 Pokémon Showdown 官方站和常见 PS 服务器上使用，不需要连接作者的私服。

### 主要功能

- 汉化主界面、队伍编辑器、搜索结果、悬浮提示和战斗日志
- 支持用中文搜索宝可梦、招式、特性和道具
- 保留 Showdown 官方英文 ID，不改变对战协议和对战结果
- 不替换玩家昵称、聊天内容和队伍导入导出文本

例如组队时可以直接输入：

- 皮卡丘
- 十万伏特
- 避雷针
- 讲究围巾

脚本会找到对应项目，但客户端提交给服务器的仍然是 Showdown 官方英文 ID，因此不会改变队伍格式，也不参与任何伤害或规则计算。

### 安装地址

- Greasy Fork：https://greasyfork.org/zh-CN/scripts/588764-pok%C3%A9mon-showdown-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87
- ScriptCat：https://scriptcat.org/zh-CN/script-show-page/7194

### 源码与反馈

https://github.com/SyaOtiLan/pokemon-showdown-zh-hans

项目基于 PSChina Server Translation、PKHeX 和 Pokémon Showdown 的开源内容整理，并保留了来源与许可证说明。在原有汉化基础上增加了中文名称搜索、自动生成、覆盖率审计和新版客户端适配。

少量最新游戏内容或 Showdown 新页面可能暂时显示英文。如果发现漏译、误译、中文搜索失败或页面异常，欢迎在 GitHub Issues 中反馈，并附上出现问题的位置和英文原文。

## 建议配图

发布时建议使用三张真实截图：

1. 队伍编辑器输入“十万伏特”并显示搜索结果。
2. 宝可梦、特性或道具的中文名称与中文说明。
3. 一场对战中的中文战斗日志。

截图中请遮挡账号名、好友昵称、私聊内容和私人服务器地址。
