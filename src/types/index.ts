/**
 * UUP Dump Windows ISO Builder Types
 */

// 架构类型
export type Architecture = 'amd64' | 'arm64' | 'x86';

// 语言代码类型
export type LanguageCode = 
  | 'zh-cn' | 'zh-tw' | 'en-us' | 'en-gb' | 'ja-jp' | 'ko-kr'
  | 'de-de' | 'fr-fr' | 'fr-ca' | 'es-es' | 'es-mx' | 'it-it'
  | 'pt-br' | 'pt-pt' | 'ru-ru' | 'ar-sa' | 'he-il' | 'th-th'
  | 'pl-pl' | 'cs-cz' | 'sk-sk' | 'hu-hu' | 'ro-ro' | 'bg-bg'
  | 'hr-hr' | 'sl-si' | 'et-ee' | 'lv-lv' | 'lt-lt' | 'fi-fi'
  | 'sv-se' | 'da-dk' | 'nb-no' | 'nl-nl' | 'el-gr' | 'tr-tr'
  | 'uk-ua' | 'sr-latn-rs' | 'neutral';

// Windows版本类型
export type WindowsEdition = 
  | 'core' | 'professional' | 'enterprise' | 'education'
  | 'coresinglelanguage' | 'professionalworkstation' | 'professionaleducation'
  | 'enterprisemultisession' | 'iotenterprise' | 'iotenterprisesubscription'
  | 'coren' | 'professionaln' | 'enterprisen' | 'educationn'
  | 'professionalworkstationn' | 'professionaleducationn';

// 下载方式类型
export type DownloadMethod = 
  | 'aria2' // aria2下载脚本
  | 'convert' // 转换脚本包
  | 'iso_download'; // 直接ISO下载

// 构建信息接口
export interface BuildInfo {
  id: string;
  title: string;
  architecture: Architecture;
  version: string;
  language: LanguageCode;
  link: string;
}

// 语言信息接口
export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  url?: string;
}

// 版本信息接口
export interface EditionInfo {
  name: string;
  value: WindowsEdition;
  code: string;
  checked?: boolean;
}

// 下载配置接口
export interface DownloadConfig {
  autodl: '1' | '2' | '3'; // 1: aria2脚本, 2: 转换脚本包, 3: 直接下载
  updates: boolean; // 包含更新
  cleanup: boolean; // 清理临时文件
  netfx: boolean; // 包含.NET Framework
  esd: boolean; // 使用ESD格式
  virtualEditions: string[]; // 虚拟版本
}

// 目标配置接口
export interface TargetConfig {
  id: string;
  name: string;
  description: string;
  buildId: string;
  search: string;
  lang: LanguageCode;
  language: LanguageCode;
  edition: string;
  editions: WindowsEdition[];
  architecture: Architecture;
  downloadConfig: Partial<DownloadConfig>;
}

// 下载链接接口
export interface DownloadLink {
  text: string;
  url: string | undefined;
  isDirectDownload: boolean;
  data?: any;
}

// 下载信息接口
export interface DownloadInfo {
  buildId: string;
  language: string;
  version: string;
  downloadLinks: DownloadLink[];
  buildInfo?: any;
}

// 构建结果接口
export interface BuildResult {
  success: boolean;
  target?: string;
  buildId?: string;
  buildTitle?: string;
  language?: string;
  edition?: string;
  isoPath?: string;
  scriptPath?: string;
  error?: string;
  duration?: number;
}

// 日志级别类型
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志接口
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Scraper接口
export interface Scraper {
  getAvailableBuilds(): Promise<BuildInfo[]>;
  getLanguages(buildId: string): Promise<LanguageInfo[]>;
  getEditions(buildId: string, language: string): Promise<EditionInfo[]>;
  getDownloadInfo(buildId: string, language: string, editions: string): Promise<DownloadInfo>;
}

// 构建器接口
export interface Builder {
  buildIso(target: TargetConfig): Promise<BuildResult>;
}