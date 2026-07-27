# Pokémon Showdown 简体中文

为 Pokémon Showdown 网页客户端提供简体中文界面、战斗日志和中文名称搜索。

## 主要功能

- 翻译主界面、队伍编辑器、搜索结果、招式说明、悬浮提示和战斗日志
- 支持使用中文搜索宝可梦、招式、特性和道具
- 支持 Pokémon Showdown 官方站以及常见的 `psim.us` 服务器
- 保持 Showdown 原有英文 ID 和对战协议，不改变对战机制
- 不翻译或修改玩家昵称、聊天内容和队伍导入导出文本

例如在队伍编辑器中，可以直接搜索“皮卡丘”“十万伏特”“避雷针”或“讲究围巾”。

## 使用方法

1. 安装 Tampermonkey 或 Violentmonkey。
2. 安装本脚本。
3. 打开 Pokémon Showdown，刷新页面即可生效。

官方网站：

https://play.pokemonshowdown.com/

## 注意事项

- 本脚本只修改客户端显示和中文搜索，不修改服务器数据或对战结果。
- Pokémon Showdown 更新后，少量新页面或最新游戏内容可能暂时显示英文。
- CAP、Pokéstar 等 Showdown 自创或非官方内容不属于主要翻译范围。
- 如果发现漏译、误译或页面异常，请前往 GitHub 提交 Issue。

## 开源与致谢

项目源码：

https://github.com/SyaOtiLan/pokemon-showdown-zh-hans

本项目使用并整理了以下开源项目的数据或代码：

- PSChina Server Translation SV 1.7.2，作者 AL、WyAK，原脚本标注 MIT
- PKHeX 中文文本，GPL-3.0
- Pokémon Showdown 数据与客户端，MIT / AGPL-3.0
- 本项目贡献者提供的人工校对与生成工具

本脚本以 AGPL-3.0 许可证发布，详细版权信息请参阅项目仓库中的 LICENSE 和 THIRD_PARTY_NOTICES.md。

## 隐私

本脚本不收集、上传或出售用户数据，也不包含统计、广告或远程执行代码。
