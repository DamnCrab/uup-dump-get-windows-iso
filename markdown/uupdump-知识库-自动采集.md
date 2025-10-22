# UUP dump 知识库（自动采集版）

> 由 Playwright 抓取脚本生成的结构化数据，源：`playwright/output/uupdump-data.json` 与 `playwright/output/uupdump-types-summary.json`。

## 数据结构说明

- 顶层：
  - `scrapedAt`: 抓取时间（ISO 字符串）
  - `channels[]`: 渠道数组
- `channels[]`：
  - `category`: 渠道标识（如 `canary`、`w11-25h2`、`w11-22h2`）
  - `url`: 渠道列表入口（`known.php?q=category:...`）
  - `pages`: 抓取的分页数（当前为 2）
  - `versions[]`: 每页抓到的构建条目（含标题、链接、架构、时间、类型）
  - `parametersByVersionId`: 以 `id` 为键的下载参数快照（必传、可选、表单方法、action）
  - `versionTypeCounts`: 该渠道内版本类型计数

## 分类汇总说明

- 文件：`playwright/output/uupdump-types-summary.json`
- 结构：`TypesSummary`
  - `summaryAt`：汇总生成时间（ISO 字符串）
  - `countsByType`：各 `VersionType` 的总计数字典
  - `itemsByType`：按 `VersionType` 分组的版本条目（含 `channel、id、title、href、arch、addedAt`）

## 版本类型分类

- Windows 11
- Windows 10
- Windows Server
- Windows 11 Insider Preview
- Cumulative Update for Windows 11
- Cumulative Update Preview for Windows 11
- Feature update to Windows 10
- Other（未匹配的标题归类）

## 下载参数说明

- 必传参数（来自 `form.action` 的查询串）：
  - `id`: 构建 ID（UUID）
  - `pack`: 语言代码（例如 `en-us` / `zh-cn`）
  - `edition[]`: 小写分号分隔（例如 `professional;core`）
- 可选参数（表单字段）：
  - `autodl`: `1|2|3`（默认通常为 `2`）
  - `updates`: 复选（选中提交 `updates=1`）
  - `cleanup`: 复选（选中提交 `cleanup=1`）
  - `netfx`: 复选（选中提交 `netfx=1`）
  - `esd`: 复选（选中提交 `esd=1`）
  - `virtualEditions[]`: 展示为“已选且禁用”，不随表单提交（由后端默认生成）

## 使用方式

- 安装依赖并运行抓取：
  - `pnpm i`（在仓库根目录）
  - 进入 `playwright/`：`cd playwright`
  - 安装 Playwright 依赖（如果未安装）：`pnpm i`
  - 运行抓取：`pnpm run scrape`
- 抓取完成后，查看 `playwright/output/uupdump-data.json` 并对照本页结构查阅。

## 更新建议

- 若需扩大渠道覆盖范围，可在首页解析到的 `known.php?q=category:*` 基础上追加种子渠道。
- 如需更精细的版本类型枚举，可在 `src/scrape.ts` 的 `classifyTitle()` 中扩充匹配规则。
- 若遇到请求失败，脚本会在 `parametersByVersionId[id]` 处记录 `error` 字段，必要时提高超时或降低并发。