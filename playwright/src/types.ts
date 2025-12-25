// 架构枚举（从列表页解析到的架构文本标准化）
export type Arch = 'x64' | 'arm64' | 'x86' | 'amd64';

// 版本类型枚举（通过标题算法匹配得到的分类）
export type VersionType =
  | 'Windows 11 Insider Preview'
  | 'Windows 11'
  | 'Windows 10'
  | 'Windows Server'
  | 'Feature update to Windows 10'
  | 'Feature update to Windows 11'
  | 'Feature update to Windows Insider Preview'
  | 'Cumulative Update for Windows 11'
  | 'Cumulative Update Preview for Windows 11'
  | 'Cumulative Update for Windows 10'
  | 'Cumulative Update Preview for Windows 10'
  | 'Cumulative Update for Azure Stack HCI'
  | 'Cumulative Update for Windows CPC OS'
  | 'Feature update to Azure Stack HCI'
  | 'Windows Server Insider Preview'
  | 'Other';

// 渠道链接（从首页发现或固定种子渠道）
export interface ChannelLink {
  category: string; // 例如 canary、w11-25h2、w11-22h2
  url: string; // known.php?q=category:xxx
  source: 'homepage' | 'seed' | 'dynamic' | 'fallback';
}

// 版本条目（来自 known.php 渠道列表页的表格）
export interface VersionEntry {
  title: string;
  href: string; // 指向 selectlang.php?id=...
  id?: string;
  arch?: Arch;
  addedAt?: string;
  type: VersionType;
}

// 下载方式值域（autodl）
export type AutodlValue = '1' | '2' | '3';

// 必传参数（从表单 action 的查询串解析得到）
export interface RequiredParams {
  id: string;
  pack: string;
  edition: string[]; // 小写、分号分隔在 action 中体现
}

// 可选参数快照（从选项页的表单字段解析）
export interface OptionalParamsSnapshot {
  autodl: { values: AutodlValue[]; default: AutodlValue };
  updates?: boolean;
  cleanup?: boolean;
  netfx?: boolean;
  esd?: boolean;
  virtualEditions?: string[]; // 页面展示但通常为禁用
}

// 版本的参数信息（必传、可选、以及请求方法与 action 原始值）
export interface VersionParameters {
  required: RequiredParams;
  optional: OptionalParamsSnapshot;
  method: 'GET' | 'POST';
  formAction: string; // 表单的 action 原始字符串
}

// 渠道抓取数据（前两页聚合后的版本表与类型计数）
export interface ChannelData {
  category: string;
  url: string;
  pages: number; // 抓取的页数（当前为 2）
  versions: VersionType[]; // 实际发现的版本类型列表
  versionTypeCounts: Record<VersionType, number>;
}

// 知识库 JSON 顶层结构（原始抓取结果）
export interface KnowledgeBase {
  scrapedAt: string;
  channels: ChannelData[];
}

// 分类汇总项（用于聚合到单独的 JSON）
export interface SummaryItem {
  channel: string;
  id?: string;
  title: string;
  href: string;
  arch?: Arch;
  addedAt?: string;
}

// 分类汇总结构（聚合所有渠道的类型与条目）
export interface TypesSummary {
  summaryAt: string;
  countsByType: Record<VersionType, number>;
  itemsByType: Record<VersionType, SummaryItem[]>;
}

// 简化版本条目（包含表单提交所需的完整参数）
export interface SimplifiedVersionEntry {
  id: string;
  title: string;
  href: string;
  arch?: Arch;
  addedAt?: string;
  type: VersionType;
  channel: string;
  channelUrl: string;
  // 表单提交参数（如果成功获取）
  formParams?: {
    pack?: string;
    edition?: string[];
    autodl?: AutodlValue;
    updates?: boolean;
    cleanup?: boolean;
    netfx?: boolean;
    esd?: boolean;
    virtualEditions?: string[];
    method?: 'GET' | 'POST';
    formAction?: string;
  };
}

// 简化的知识库结构（只包含平铺的versions数组）
export interface SimplifiedKnowledgeBase {
  scrapedAt: string;
  versions: SimplifiedVersionEntry[];
}