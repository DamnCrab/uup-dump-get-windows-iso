# UUP Dump Windows ISO Builder / Windows ISO 自动构建工具

[English](#english) | [中文](#中文)

---

## English

### 🚀 Overview

This project is an automated CI/CD solution to download and build Windows ISO files from [UUP dump](https://uupdump.net). It consists of two main components:

1.  **Scraper (`playwright/`)**: A robust web scraper using Playwright to monitor UUP dump for new builds. It handles Cloudflare challenges, incremental updates, and rate limiting.
2.  **Builder (`builder/`)**: A rule-based automation engine that checks scraped data against user-defined rules (`rules.ts`), downloads the UUP package, and compiles the ISO file on your local machine or GitHub Actions runner.

### ✨ Features

-   **Automated Workflow**: From discovery to ISO creation, fully automated via GitHub Actions.
-   **Incremental Updates**: Only processes new builds, saving time and bandwidth.
-   **Rule-Based Selection**: Define what you want (e.g., "Windows 11 24H2 Insider Preview x64 Chinese") in a config file, and it handles the rest.
-   **Modern Tech Stack**: Built with TypeScript, Playwright, and PowerShell Core (pwsh).
-   **Bilingual Support**: Code and documentation are fully commented in English and Chinese.

---

### 📖 How to Use (For Forkers)

1.  **Fork this Repository**: Click the "Fork" button on GitHub.
2.  **Enable GitHub Actions**: Go to the "Actions" tab in your forked repository and enable workflows.
3.  **Wait or Trigger**:
    -   The `scrape` workflow runs daily at 02:00 UTC to update build data.
    -   The `uup-auto-build` workflow runs every 3 days to check for matches and build ISOs.
    -   You can also manually trigger the `uup-auto-build` workflow from the Actions tab.
4.  **Download ISOs**:
    -   Once the build completes successfully, go to the workflow summary page.
    -   You will find the generated ISO under the "Artifacts" section named `Windows-ISOs`.

### 🛠️ Local Development & Running

#### Prerequisites
-   Node.js v20+
-   pnpm (`npm install -g pnpm`)
-   Windows OS (Required for ISO building script)

#### 1. Scraping Data
To scrape the latest build information:

```bash
cd playwright
pnpm install
# Scrape HTML pages
pnpm run scrape
# Analyze data and generate incremental updates
pnpm run analyze
```
Data will be saved in `playwright/output/`.

#### 2. Building ISOs
To match rules and build ISOs:

```bash
cd builder
pnpm install
pnpm start
```
The ISO will be generated in `builder/output/`.

### ⚙️ Configuration

Modify `builder/src/config/rules.ts` to customize your build targets.

```typescript
export const rules: BuildRule[] = [
    {
        name: "Win11_24H2_x64_Latest",
        category: "w11-24h2",
        titlePattern: /^Windows 11, version 24H2/,
        arch: "x64",
        language: "zh-cn",
        editions: ["PROFESSIONAL", "CORE"],
        virtualEditions: ["Enterprise"], // Optional: Build Enterprise edition
        downloadMethod: "3", // '3' is required for virtual editions
        options: ["updates", "cleanup", "netfx", "esd"]
    }
];
```

---

## 中文

### 🚀 项目概览

本项目是一个自动化的 CI/CD 解决方案，用于从 [UUP dump](https://uupdump.net) 下载并构建 Windows ISO 镜像。它包含两个核心组件：

1.  **抓取器 (`playwright/`)**: 基于 Playwright 的网络抓取工具，用于监控 UUP dump 的新版本发布。它支持处理 Cloudflare 验证、增量更新和速率限制。
2.  **构建器 (`builder/`)**: 基于规则的自动化引擎。它会根据用户定义的规则 (`rules.ts`) 检查抓取的数据，自动下载 UUP 包，并在本地或 GitHub Actions 运行器上编译生成 ISO 文件。

### ✨ 主要特性

-   **全自动化流程**: 从发现新版本到生成 ISO 全程自动，无需人工干预。
-   **增量更新**: 仅处理新发布的构建版本，节省时间和带宽。
-   **规则驱动**: 只需在配置文件中定义你想要的版本（例如：“Windows 11 24H2 开发者预览版 x64 中文”），剩下的交给它。
-   **现代技术栈**: 使用 TypeScript、Playwright 和 PowerShell Core (pwsh) 构建。
-   **双语支持**: 代码和文档均包含完整的中英文注释。

---

### 📖 如何使用 (Fork 用户)

1.  **Fork 本仓库**: 点击 GitHub 右上角的 "Fork" 按钮。
2.  **启用 GitHub Actions**: 进入你 Fork 后的仓库的 "Actions" 标签页，启用工作流。
3.  **等待或手动触发**:
    -   `scrape` 工作流每天 02:00 UTC 自动运行，更新版本数据。
    -   `uup-auto-build` 工作流每 3 天运行一次，检查是否有符合规则的新版本并构建 ISO。
    -   你也可以在 Actions 页面手动触发 `uup-auto-build` 工作流。
4.  **下载 ISO**:
    -   构建成功后，进入工作流运行的详情页面。
    -   在底部的 "Artifacts" (构建产物) 区域，你可以找到名为 `Windows-ISOs` 的文件进行下载。

### 🛠️ 本地开发与运行

#### 环境要求
-   Node.js v20+
-   pnpm (`npm install -g pnpm`)
-   Windows 操作系统 (构建 ISO 脚本必须在 Windows 下运行)

#### 1. 抓取数据
获取最新的 UUP 版本信息：

```bash
cd playwright
pnpm install
# 抓取页面 HTML
pnpm run scrape
# 分析参数并生成增量数据
pnpm run analyze
```
数据将保存在 `playwright/output/` 目录中。

#### 2. 构建 ISO
根据规则匹配并构建镜像：

```bash
cd builder
pnpm install
pnpm start
```
生成的 ISO 文件将位于 `builder/output/` 目录中。

### ⚙️ 配置说明

修改 `builder/src/config/rules.ts` 来自定义你的构建目标。

```typescript
export const rules: BuildRule[] = [
    {
        name: "Win11_24H2_x64_Latest",
        category: "w11-24h2",
        titlePattern: /^Windows 11, version 24H2/, // 标题匹配正则
        arch: "x64",
        language: "zh-cn",
        editions: ["PROFESSIONAL", "CORE"], // 包含专业版和家庭版
        virtualEditions: ["Enterprise"], // 可选：构建企业版
        downloadMethod: "3", // 虚拟版本需要此选项为 '3'
        options: ["updates", "cleanup", "netfx", "esd"] // 构建选项
    }
];
```

---

### 📄 License

MIT License. Based on data provided by [UUP dump](https://uupdump.net).
