# UUP dump 主页筛选项与下载选项研究（自动采集）

> 数据采集来源：https://uupdump.net/（采样时间：近期）。本页记录主页筛选项的分类与示例、下载选项页的字段和值域，以及“创建下载包”按钮的实际请求形态，便于开发与自动化对接。

## 主页筛选项（分类与示例）

- 采集统计（一次采样）：
  - 总构建入口链接（`selectlang.php?id=...`）：15
  - Windows 11：9；Windows 10：6；Windows Server：0（采样时未出现）
- 构建入口文本包含：产品线（Windows 11/10/Server）、版本/内部版本号、架构（`amd64`/`arm64`/`x86`）。

| 产品线 | 示例标题 | 架构 | 入口链接 |
|---|---|---|---|
| Windows 11 | Windows 11, version 23H2 (22631.6130) | amd64 | `https://uupdump.net/selectlang.php?id=2a19edd9-c6a3-499b-9ae3-5e1a6b5c4c97` |
| Windows 11 | Windows 11, version 23H2 (22631.6130) | arm64 | `https://uupdump.net/selectlang.php?id=7702f052-998a-438c-886f-a0ee9944cdf6` |
| Windows 11 | Windows 11 Insider Preview 27971.1 (br_release) | amd64 | `https://uupdump.net/selectlang.php?id=76b16992-3047-4b6f-85e0-f825c17b40d1` |
| Windows 11 | Windows 11 Insider Preview 27971.1 (br_release) | arm64 | `https://uupdump.net/selectlang.php?id=3a010474-f0b0-4abf-a5fe-78e46b2fe424` |
| Windows 10 | Feature update to Windows 10, version 22H2 (19045.6456) | amd64 | `https://uupdump.net/selectlang.php?id=fecdba26-1a88-4564-8b2e-4c2853eb9bf0` |
| Windows 10 | Feature update to Windows 10, version 22H2 (19045.6456) | x86 | `https://uupdump.net/selectlang.php?id=6f74a2f6-b680-41dc-b1a3-5e77fb503eec` |

> 注：主页另有“快速选项”（最新公开版、Release Preview、Beta、Dev、Canary）入口，具体列表会随时间更新；采样期未检索到独立区块标题，但直接构建入口依然按上述产品线与架构进行区分。

## 版本类型（渠道）分类基准

| 渠道 | 描述 | 稳定性 | 适用人群 |
|---|---|---|---|
| 最新公开发布 | 面向普通用户的最新稳定版本 | 高 | 生产环境、一般用户 |
| Release Preview | 即将发布版本的预览 | 较高 | 预发布验证、企业试用 |
| Beta | 包含多数新功能、相对可靠 | 中 | 早期采用者、开发测试 |
| Dev | 前沿/实验功能，变动较大 | 较低 | 爱好者、深度测试 |
| Canary | 最新平台更改，最不稳定 | 低 | 高度技术用户、探索 |

## 下载选项页（字段与值域）

在：`download.php`/`get.php` 表单页观察到以下字段（示例构建：Windows 11 23H2 amd64；语言：`zh-cn`；版本：`PROFESSIONAL` + `CORE`）：

| 字段名 | 类型 | 值域/示例 | UI 默认值（采样） | 提交形态 |
|---|---|---|---|---|
| `autodl` | 单选（radio） | `1`（aria2脚本）/`2`（转换脚本包）/`3`（直接下载） | `2` | `autodl=<1|2|3>` |
| `updates` | 复选（checkbox） | `1` | 选中 | 选中时包含 `updates=1` |
| `cleanup` | 复选（checkbox） | `1` | 选中 | 选中时包含 `cleanup=1` |
| `netfx` | 复选（checkbox） | `1` | 未选中 | 选中时包含 `netfx=1`，未选中不出现 |
| `esd` | 复选（checkbox） | `1` | 未选中 | 选中时包含 `esd=1`，未选中不出现 |
| `virtualEditions[]` | 复选（checkbox，禁用） | `CoreSingleLanguage`、`ProfessionalWorkstation`、`ProfessionalEducation`、`Education`、`Enterprise`、`ServerRdsh`、`IoTEnterprise` | 默认均“已选中且禁用” | 不随表单提交（禁用不入 FormData） |
| `id` | 查询参数（在表单 `action`） | 构建 ID（UUID） | 见链接 | 作为 URL 查询：`id=<buildId>` |
| `pack` | 查询参数（在表单 `action`） | 语言代码，如 `zh-cn`/`en-us` | 选中语言 | 作为 URL 查询：`pack=<langCode>` |
| `edition` | 查询参数（在表单 `action`） | 以分号分隔的小写值 | 由勾选版本生成 | 作为 URL 查询：如 `edition=professional;core` |

> 关键点：`virtualEditions[]` 在页面中显示为“默认将生成的虚拟版本”，但控件为禁用状态，故不会参与提交；服务器端会根据基础版本（例如 `PROFESSIONAL`/`CORE`）默认生成这些虚拟版本。

## “创建下载包”按钮的实际请求形态（示例）

- 表单属性：
  - `method`: `POST`
  - `action`: `get.php?id=<buildId>&pack=<langCode>&edition=<lowercase;semicolon-separated>`
- 采样示例：

```http
POST https://uupdump.net/get.php?id=2a19edd9-c6a3-499b-9ae3-5e1a6b5c4c97&pack=zh-cn&edition=professional%3Bcore
Content-Type: application/x-www-form-urlencoded

autodl=2&updates=1&cleanup=1
```

- 变体与补充：
  - 若勾选 `.NET Framework`：额外包含 `netfx=1`
  - 若勾选 `ESD`：额外包含 `esd=1`
  - `virtualEditions[]` 不随表单提交（禁用），默认集由服务器端确定。
  - 选择 `autodl=3`（直接下载）时，流程可能进入不同的后端处理（如生成 ZIP/ISO 直链），但前端字段名与取值规则保持一致。

## 值域与映射小结

- 下载方式 `autodl`：`1`（aria2脚本）、`2`（转换脚本包，页面默认）、`3`（直接下载）。
- 开关类选项：`updates`/`cleanup`/`netfx`/`esd` 采用“存在即为 1”的布尔提交（未勾选则不出现）。
- 语言与版本：通过表单 `action` 的查询参数传递：`pack=<lang>`；`edition=<ed1;ed2;...>`（小写、分号分隔）。
- 虚拟版本：页面展示但禁用，不入表单；默认虚拟版集合通常包含：`CoreSingleLanguage`、`ProfessionalWorkstation`、`ProfessionalEducation`、`Education`、`Enterprise`、`ServerRdsh`、`IoTEnterprise`。

## 使用建议（面向多版本构建）

- 常用推荐：`autodl=3`（直接下载）、启用 `updates`/`cleanup`，按需启用 `netfx` 与 `esd`。
- 生产环境优先选择“最新公开发布”或已 GA 的版本；预发布验证可选 Release Preview / Beta；不建议 Dev/Canary 用于生产。
- 架构选择：现代桌面优先 `x64`；ARM 设备选 `arm64`；仅遗留设备考虑 `x86`。

---

> 说明：主页入口与可选项会随微软发布节奏变化，以上为一次近期采样的结构化记录。若需定期更新，可将采集脚本纳入 CI 定时任务，输出最新表格至本页。