// ==========================================
// UUP Dump Scraper 类型定义
// ==========================================

/**
 * CPU 架构枚举
 * 从列表页解析到的架构文本标准化与其对应
 */
export type Arch = 'x64' | 'arm64' | 'x86' | 'amd64';

/**
 * 渠道链接对象
 * 表示首页 "Quick options" 或下拉菜单中的一个可点击项
 */
export interface ChannelLink {
  name: string;      // 显示名称，如 "Windows 11 22H2", "Dev Channel"
  url?: string;      // 跳转链接 (如果是下拉菜单父级则可能为空)
  isDropdown: boolean; // 是否为下拉菜单容器
  subLinks?: ChannelLink[]; // 子链接列表 (仅当 isDropdown 为 true 时存在)
  category?: string; // 分类标识 (从 URL query 参数q中提取，如 'w11-22h2')
  source: 'homepage' | 'seed' | 'dynamic' | 'fallback'; // 数据来源标识
}

/**
 * 版本条目
 * 对应列表页 (known.php) 表格中的一行数据
 */
export interface VersionEntry {
  title: string;     // 版本完整标题 (如 "Windows 11 Insider Preview 26080.1...")
  href: string;      // 详情页链接 (selectlang.php?id=...)
  id?: string;       // 提取出的唯一其 ID (uuid)
  arch?: Arch;       // 架构
  addedAt?: string;  // 添加日期
}

/**
 * 渠道数据对象
 * 包含该渠道的基本信息及所有抓取到的版本列表
 * 将被保存为独立 JSON 文件 (如 w11-24h2.json)
 */
export interface ChannelData {
  category: string;  // 分类标识 (文件名依据)
  url: string;       // 抓取源 URL
  name: string;      // 渠道名称
  parentName?: string; // 父级名称 (如 "Windows 11")
  pages: number;     // 抓取到的总页数或估算值
  versions: VersionEntry[]; // 版本列表
}

/**
 * 知识库元数据 (uupdump-data.json)
 * 仅保存层级结构，具体数据存储在各自分类文件中
 */
export interface KnowledgeBase {
  scrapedAt: string; // 抓取时间 (ISO 格式)
  hierarchy: ChannelLink[]; // 首页完整的层级结构
}