/**
 * UUP Dump Windows ISO Builder Types
 * UUP Dump Windows ISO 构建器类型定义
 * 
 * This file contains all TypeScript type definitions used throughout the project.
 * It defines interfaces and types for configurations, build results, and API responses.
 * 
 * 此文件包含项目中使用的所有 TypeScript 类型定义。
 * 它定义了配置、构建结果和 API 响应的接口和类型。
 */

/**
 * Supported CPU architectures for Windows builds
 * Windows 构建支持的 CPU 架构
 */
export type Architecture = 'amd64' | 'arm64' | 'x86';

/**
 * Supported language codes for Windows localization
 * Windows 本地化支持的语言代码
 */
export type LanguageCode = 
  | 'zh-cn' | 'zh-tw' | 'en-us' | 'en-gb' | 'ja-jp' | 'ko-kr'
  | 'de-de' | 'fr-fr' | 'fr-ca' | 'es-es' | 'es-mx' | 'it-it'
  | 'pt-br' | 'pt-pt' | 'ru-ru' | 'ar-sa' | 'he-il' | 'th-th'
  | 'pl-pl' | 'cs-cz' | 'sk-sk' | 'hu-hu' | 'ro-ro' | 'bg-bg'
  | 'hr-hr' | 'sl-si' | 'et-ee' | 'lv-lv' | 'lt-lt' | 'fi-fi'
  | 'sv-se' | 'da-dk' | 'nb-no' | 'nl-nl' | 'el-gr' | 'tr-tr'
  | 'uk-ua' | 'sr-latn-rs' | 'neutral';

/**
 * Windows edition types available for download
 * 可下载的 Windows 版本类型
 */
export type WindowsEdition = 
  | 'core' | 'professional' | 'enterprise' | 'education'
  | 'coresinglelanguage' | 'professionalworkstation' | 'professionaleducation'
  | 'enterprisemultisession' | 'iotenterprise' | 'iotenterprisesubscription'
  | 'coren' | 'professionaln' | 'enterprisen' | 'educationn'
  | 'professionalworkstationn' | 'professionaleducationn';

/**
 * Download methods supported by UUP Dump
 * UUP Dump 支持的下载方式
 */
export type DownloadMethod = 
  | 'aria2' // aria2 download script / aria2下载脚本
  | 'convert' // conversion script package / 转换脚本包
  | 'iso_download'; // direct ISO download / 直接ISO下载

/**
 * Build information from UUP Dump API
 * 来自 UUP Dump API 的构建信息
 */
export interface BuildInfo {
  id: string; // Build ID / 构建 ID
  title: string; // Build title / 构建标题
  architecture: Architecture; // CPU architecture / CPU 架构
  version: string; // Windows version / Windows 版本
  language: LanguageCode; // Language code / 语言代码
  link: string; // Download link / 下载链接
}

/**
 * Language information for Windows builds
 * Windows 构建的语言信息
 */
export interface LanguageInfo {
  code: LanguageCode; // Language code / 语言代码
  name: string; // Display name / 显示名称
  url?: string; // Optional URL / 可选 URL
}

/**
 * Windows edition information
 * Windows 版本信息
 */
export interface EditionInfo {
  name: string; // Edition display name / 版本显示名称
  value: WindowsEdition; // Edition value / 版本值
  code: string; // Edition code / 版本代码
  checked?: boolean; // Whether selected / 是否选中
}

/**
 * Download configuration options
 * 下载配置选项
 */
export interface DownloadConfig {
  autodl: '1' | '2' | '3'; // 1: aria2 script, 2: conversion package, 3: direct download / 1: aria2脚本, 2: 转换脚本包, 3: 直接下载
  updates: boolean; // Include updates / 包含更新
  cleanup: boolean; // Clean temporary files / 清理临时文件
  netfx: boolean; // Include .NET Framework / 包含.NET Framework
  esd: boolean; // Use ESD format / 使用ESD格式
  virtualEditions: string[]; // Virtual editions / 虚拟版本
}

/**
 * Target configuration for building specific Windows ISOs
 * 构建特定 Windows ISO 的目标配置
 */
export interface TargetConfig {
  id: string; // Unique target identifier / 唯一目标标识符
  name: string; // Display name / 显示名称
  description: string; // Target description / 目标描述
  buildId: string; // UUP build ID / UUP 构建 ID
  search: string; // Search term for finding builds / 查找构建的搜索词
  lang: LanguageCode; // Language code / 语言代码
  language: LanguageCode; // Language code (alias) / 语言代码（别名）
  edition: string; // Edition string / 版本字符串
  editions: WindowsEdition[]; // Available editions / 可用版本
  architecture: Architecture; // Target architecture / 目标架构
  downloadConfig: Partial<DownloadConfig>; // Download configuration / 下载配置
}

/**
 * Download link information
 * 下载链接信息
 */
export interface DownloadLink {
  text: string; // Link display text / 链接显示文本
  url: string | undefined; // Download URL / 下载 URL
  isDirectDownload: boolean; // Whether it's a direct download / 是否为直接下载
  data?: any; // Additional data / 附加数据
}

/**
 * Download information from UUP Dump
 * 来自 UUP Dump 的下载信息
 */
export interface DownloadInfo {
  buildId: string; // Build ID / 构建 ID
  language: string; // Language / 语言
  version: string; // Version / 版本
  downloadLinks: DownloadLink[]; // Available download links / 可用下载链接
  buildInfo?: any; // Additional build information / 附加构建信息
}

/**
 * Result of the ISO building process
 * ISO 构建过程的结果
 */
export interface BuildResult {
  success: boolean; // Whether build was successful / 构建是否成功
  target?: string; // Target configuration ID / 目标配置 ID
  buildId?: string; // Build ID / 构建 ID
  buildTitle?: string; // Build title / 构建标题
  language?: string; // Language / 语言
  edition?: string; // Edition / 版本
  isoPath?: string; // Path to generated ISO / 生成的 ISO 路径
  scriptPath?: string; // Path to build script / 构建脚本路径
  error?: string; // Error message if failed / 失败时的错误消息
  duration?: number; // Build duration in milliseconds / 构建持续时间（毫秒）
}

/**
 * Logging levels
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface for consistent logging across the application
 * 应用程序中一致日志记录的日志接口
 */
export interface Logger {
  debug(message: string, ...args: any[]): void; // Debug level logging / 调试级别日志
  info(message: string, ...args: any[]): void; // Info level logging / 信息级别日志
  warn(message: string, ...args: any[]): void; // Warning level logging / 警告级别日志
  error(message: string, ...args: any[]): void; // Error level logging / 错误级别日志
}

/**
 * Scraper interface for extracting data from UUP Dump website
 * 从 UUP Dump 网站提取数据的爬虫接口
 */
export interface Scraper {
  getAvailableBuilds(): Promise<BuildInfo[]>; // Get available builds / 获取可用构建
  getLanguages(buildId: string): Promise<LanguageInfo[]>; // Get languages for build / 获取构建的语言
  getEditions(buildId: string, language: string): Promise<EditionInfo[]>; // Get editions / 获取版本
  getDownloadInfo(buildId: string, language: string, editions: string): Promise<DownloadInfo>; // Get download info / 获取下载信息
}

/**
 * Builder interface for creating Windows ISOs
 * 创建 Windows ISO 的构建器接口
 */
export interface Builder {
  buildIso(target: TargetConfig): Promise<BuildResult>; // Build ISO from target config / 从目标配置构建 ISO
}