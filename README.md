# UUP Dump Windows ISO Builder

[English](#english) | [中文](#中文)

---

## English

### About

This project is a TypeScript-based command-line tool that automatically downloads and builds Windows ISO files from Microsoft's [Unified Update Platform (UUP)](https://docs.microsoft.com/en-us/windows/deployment/update/windows-update-overview). It wraps the [UUP dump](https://git.uupdump.net/uup-dump) project functionality into a single, easy-to-use command.

### Features

- **Multiple Windows Versions**: Support for Windows 11 24H2, Insider Preview, and ARM64 versions
- **Multiple Languages**: Chinese Simplified, English US, and more
- **Multiple Editions**: Professional, Home, Enterprise, Education editions
- **Automated Process**: One-command ISO creation with automatic script download and execution
- **TypeScript**: Fully typed codebase for better maintainability
- **Flexible Configuration**: Pre-defined targets with customizable download options

### Supported Targets

| Target ID | Description | Language | Architecture | Edition |
|-----------|-------------|----------|--------------|---------|
| `windows-11-24h2-zh-cn-pro` | Windows 11 24H2 Chinese Simplified Professional | zh-cn | amd64 | Professional |
| `windows-11-24h2-zh-cn-home` | Windows 11 24H2 Chinese Simplified Home | zh-cn | amd64 | Home |
| `windows-11-24h2-zh-cn-multi` | Windows 11 24H2 Chinese Simplified Multi-Edition | zh-cn | amd64 | Pro + Home |
| `windows-11-24h2-en-us-pro` | Windows 11 24H2 English US Professional | en-us | amd64 | Professional |
| `windows-11-24h2-en-us-home` | Windows 11 24H2 English US Home | en-us | amd64 | Home |
| `windows-11-insider-zh-cn` | Windows 11 Insider Preview Chinese | zh-cn | amd64 | Professional |
| `windows-11-insider-en-us` | Windows 11 Insider Preview English | en-us | amd64 | Professional |
| `windows-11-24h2-zh-cn-arm64` | Windows 11 24H2 Chinese ARM64 | zh-cn | arm64 | Professional |
| `windows-11-24h2-zh-cn-enterprise` | Windows 11 24H2 Chinese Enterprise | zh-cn | amd64 | Enterprise |
| `windows-11-24h2-zh-cn-education` | Windows 11 24H2 Chinese Education | zh-cn | amd64 | Education |

### Prerequisites

- **Windows Environment**: Must be executed on a Windows system
- **Node.js**: Version 18 or higher
- **pnpm**: Package manager (or npm/yarn)
- **Internet Connection**: For downloading UUP packages

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/uup-dump-get-windows-iso.git
cd uup-dump-get-windows-iso
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the project:
```bash
pnpm run build
```

### Usage

#### List Available Targets
```bash
node dist/index.js --list
```

#### Build a Windows ISO
```bash
node dist/index.js --target windows-11-24h2-zh-cn-pro --output ./output
```

#### Command Line Options
- `-t, --target <target>`: Target configuration name (required)
- `-o, --output <path>`: Output directory (default: "./output")
- `-l, --list`: List all available target configurations
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help information

### Output Files

When the build completes successfully, you'll find the following files in the output directory:

- `{target-name}.iso`: The Windows ISO file
- `{target-name}.iso.sha256.txt`: SHA256 checksum file
- `{target-name}-metadata.json`: Build metadata and information

### Development

#### Project Structure
```
src/
├── builders/           # ISO building logic
│   └── windowsIsoBuilder.ts
├── config/            # Target configurations
│   └── targets.ts
├── scrapers/          # UUP dump website scraping
│   └── uupDumpScraper.ts
├── types/             # TypeScript type definitions
│   └── index.ts
├── utils/             # Utility functions
│   └── logger.ts
└── index.ts           # Main entry point
```

#### Scripts
- `pnpm run build`: Compile TypeScript to JavaScript
- `pnpm run dev`: Run in development mode with watch
- `pnpm run clean`: Clean build artifacts
- `pnpm generate-matrix`: Generate GitHub Actions matrix configuration from targets

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Related Tools

- [Rufus](https://github.com/pbatard/rufus) - Create bootable USB drives
- [Fido](https://github.com/pbatard/Fido) - Download Windows ISOs
- [UUP dump](https://uupdump.net) - Original UUP dump website

---

## 中文

### 关于

这是一个基于 TypeScript 的命令行工具，可以自动从微软的[统一更新平台 (UUP)](https://docs.microsoft.com/en-us/windows/deployment/update/windows-update-overview) 下载并构建 Windows ISO 文件。它将 [UUP dump](https://git.uupdump.net/uup-dump) 项目的功能封装成一个简单易用的命令。

### 功能特性

- **多版本支持**: 支持 Windows 11 24H2、Insider Preview 和 ARM64 版本
- **多语言支持**: 中文简体、英文美国等多种语言
- **多版本类型**: 专业版、家庭版、企业版、教育版
- **自动化流程**: 一键创建 ISO，自动下载和执行脚本
- **TypeScript**: 完全类型化的代码库，便于维护
- **灵活配置**: 预定义目标配置，支持自定义下载选项

### 支持的目标配置

| 目标 ID | 描述 | 语言 | 架构 | SKU |
|---------|------|------|------|-----|
| `windows-11-24h2-zh-cn-pro` | Windows 11 24H2 中文简体专业版 | zh-cn | amd64 | PROFESSIONAL |
| `windows-11-24h2-zh-cn-home` | Windows 11 24H2 中文简体家庭版 | zh-cn | amd64 | CORE |
| `windows-11-24h2-zh-cn-multi` | Windows 11 24H2 中文简体多版本 | zh-cn | amd64 | PROFESSIONAL |
| `windows-11-24h2-en-us-pro` | Windows 11 24H2 英文美国专业版 | en-us | amd64 | PROFESSIONAL |
| `windows-11-24h2-en-us-home` | Windows 11 24H2 英文美国家庭版 | en-us | amd64 | CORE |
| `windows-11-insider-zh-cn` | Windows 11 Insider Preview 中文版 | zh-cn | amd64 | PROFESSIONAL |
| `windows-11-insider-en-us` | Windows 11 Insider Preview 英文版 | en-us | amd64 | PROFESSIONAL |
| `windows-11-24h2-zh-cn-arm64` | Windows 11 24H2 中文 ARM64 版 | zh-cn | arm64 | PROFESSIONAL |
| `windows-11-24h2-zh-cn-enterprise` | Windows 11 24H2 中文企业版 | zh-cn | amd64 | PROFESSIONAL* |
| `windows-11-24h2-zh-cn-education` | Windows 11 24H2 中文教育版 | zh-cn | amd64 | PROFESSIONAL* |

*注：企业版和教育版使用 PROFESSIONAL 作为基础 SKU，通过虚拟版本升级实现。

### 配置选项说明

#### SKU 类型
SKU（Stock Keeping Unit）对应 UUP Dump 网站上的版本选择：
- `CORE`: 家庭版
- `PROFESSIONAL`: 专业版
- `CORECOUNTRYSPECIFIC`: 家庭单语言版
- `ENTERPRISE`: 企业版（需要通过虚拟版本升级）
- `EDUCATION`: 教育版（需要通过虚拟版本升级）

#### 下载配置选项
- `autodl`: 下载方式
  - `'1'`: 仅下载 UUP 包
  - `'2'`: 下载转换脚本包（推荐）
  - `'3'`: 直接下载，支持虚拟版本
- `virtualEditions`: 虚拟版本升级列表
  - **仅在 `autodl` 为 `'3'` 时可用**
  - 可以是具体的 SKU 数组：`['ENTERPRISE', 'EDUCATION']`
  - 或者使用 `'all'` 全选所有可用的虚拟版本
  - 支持的虚拟版本：`ENTERPRISE`、`EDUCATION`、`PROFESSIONALWORKSTATION`、`PROFESSIONALEDUCATION` 等
- `updates`: 是否包含更新
- `cleanup`: 是否清理临时文件
- `netfx`: 是否包含 .NET Framework
- `esd`: 是否使用 ESD 格式

### 系统要求

- **Windows 环境**: 必须在 Windows 系统上执行
- **Node.js**: 版本 18 或更高
- **pnpm**: 包管理器（或 npm/yarn）
- **网络连接**: 用于下载 UUP 包

### 安装

1. 克隆仓库：
```bash
git clone https://github.com/your-username/uup-dump-get-windows-iso.git
cd uup-dump-get-windows-iso
```

2. 安装依赖：
```bash
pnpm install
```

3. 构建项目：
```bash
pnpm run build
```

### 使用方法

#### 列出可用目标
```bash
node dist/index.js --list
```

#### 构建 Windows ISO
```bash
node dist/index.js --target windows-11-24h2-zh-cn-pro --output ./output
```

#### 命令行选项
- `-t, --target <target>`: 目标配置名称（必需）
- `-o, --output <path>`: 输出目录（默认："./output"）
- `-l, --list`: 列出所有可用的目标配置
- `-v, --verbose`: 启用详细输出
- `-h, --help`: 显示帮助信息

### 输出文件

构建成功完成后，您将在输出目录中找到以下文件：

- `{目标名称}.iso`: Windows ISO 文件
- `{目标名称}.iso.sha256.txt`: SHA256 校验和文件
- `{目标名称}-metadata.json`: 构建元数据和信息

### 开发

#### 项目结构
```
src/
├── builders/           # ISO 构建逻辑
│   └── windowsIsoBuilder.ts
├── config/            # 目标配置
│   └── targets.ts
├── scrapers/          # UUP dump 网站爬取
│   └── uupDumpScraper.ts
├── types/             # TypeScript 类型定义
│   └── index.ts
├── utils/             # 工具函数
│   └── logger.ts
└── index.ts           # 主入口点
```

#### 脚本命令
- `pnpm run build`: 编译 TypeScript 到 JavaScript
- `pnpm run dev`: 开发模式运行（带监听）
- `pnpm run clean`: 清理构建产物
- `pnpm generate-matrix`: 从目标配置生成 GitHub Actions matrix 配置

### 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 如适用，添加测试
5. 提交 Pull Request

### 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件。

### 相关工具

- [Rufus](https://github.com/pbatard/rufus) - 创建可启动 USB 驱动器
- [Fido](https://github.com/pbatard/Fido) - 下载 Windows ISO
- [UUP dump](https://uupdump.net) - 原始 UUP dump 网站
