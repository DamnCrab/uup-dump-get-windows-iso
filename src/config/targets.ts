/**
 * Target Configurations for Windows ISO Building
 * Windows ISO 构建的目标配置
 * 
 * This file contains predefined target configurations for building various Windows ISO files.
 * Each configuration specifies the Windows version, language, edition, architecture, and download options.
 * 
 * 此文件包含用于构建各种 Windows ISO 文件的预定义目标配置。
 * 每个配置指定 Windows 版本、语言、版本类型、架构和下载选项。
 */

import { TargetConfig, LanguageCode, WindowsEdition, Architecture } from '../types/index.js';

/**
 * Predefined Windows ISO build target configurations
 * 预定义的 Windows ISO 构建目标配置
 * 
 * Each target configuration includes:
 * - Build ID from UUP Dump
 * - Language and edition settings
 * - Architecture specification
 * - Download configuration options
 * 
 * 每个目标配置包括：
 * - 来自 UUP Dump 的构建 ID
 * - 语言和版本设置
 * - 架构规格
 * - 下载配置选项
 */
export const TARGETS: Record<string, TargetConfig> = {
  // Windows 11 24H2 Chinese Simplified / Windows 11 24H2 中文简体
  'windows-11-24h2-zh-cn-pro': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 中文简体专业版',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体专业版',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'professional',
    editions: ['professional'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2', // 转换脚本包
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: []
    }
  },

  'windows-11-24h2-zh-cn-home': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 中文简体家庭版',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体家庭版',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'core',
    editions: ['core'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: []
    }
  },

  'windows-11-24h2-zh-cn-multi': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 中文简体多版本',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体多版本（专业版+家庭版）',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'professional',
    editions: ['professional', 'core'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: ['professionalworkstation', 'professionaleducation', 'education', 'enterprise']
    }
  },

  // Windows 11 24H2 英文美国
  'windows-11-24h2-en-us-pro': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 English US Professional',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 English US Professional',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'en-us',
    language: 'en-us',
    edition: 'professional',
    editions: ['professional'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: []
    }
  },

  'windows-11-24h2-en-us-home': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 English US Home',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 English US Home',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'en-us',
    language: 'en-us',
    edition: 'core',
    editions: ['core'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: []
    }
  },

  // Windows 11 Insider Preview (最新)
  'windows-11-insider-zh-cn': {
    id: '82ce56d0-8d9e-4594-a790-7d952f5006d2',
    name: 'Windows 11 Insider Preview 中文简体',
    description: 'Windows 11 Insider Preview 10.0.26120.5742 amd64 中文简体',
    buildId: '82ce56d0-8d9e-4594-a790-7d952f5006d2',
    search: 'category:w11-insider',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'professional',
    editions: ['professional'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: []
    }
  },

  'windows-11-insider-en-us': {
    id: '82ce56d0-8d9e-4594-a790-7d952f5006d2',
    name: 'Windows 11 Insider Preview English US',
    description: 'Windows 11 Insider Preview 10.0.26120.5742 amd64 English US',
    buildId: '82ce56d0-8d9e-4594-a790-7d952f5006d2',
    search: 'category:w11-insider',
    lang: 'en-us',
    language: 'en-us',
    edition: 'professional',
    editions: ['professional'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: []
    }
  },

  // ARM64 versions / ARM64 版本
  'windows-11-24h2-zh-cn-arm64': {
    id: '70e417a4-2f71-4f94-977c-10be81ddcd0f',
    name: 'Windows 11 24H2 中文简体 ARM64',
    description: 'Windows 11 Version 24H2 (26100.4770) arm64 中文简体',
    buildId: '70e417a4-2f71-4f94-977c-10be81ddcd0f',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'professional',
    editions: ['professional'],
    architecture: 'arm64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: []
    }
  },

  // Enterprise edition configurations / 企业版配置
  'windows-11-24h2-zh-cn-enterprise': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 中文简体企业版',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体企业版',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'enterprise',
    editions: ['professional'], // Base SKU / 基础SKU
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: ['enterprise'] // Virtual upgrade to Enterprise / 虚拟升级到企业版
    }
  },

  // Education edition configurations / 教育版配置
  'windows-11-24h2-zh-cn-education': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 中文简体教育版',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体教育版',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'education',
    editions: ['professional'], // Base SKU / 基础SKU
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: ['education'] // Virtual upgrade to Education / 虚拟升级到教育版
    }
  }
};

// Utility functions for target configuration management
// 目标配置管理的工具函数

/**
 * Get all available target names
 * 获取所有可用的目标名称
 * 
 * @returns Array of target configuration names / 目标配置名称数组
 */
export function getAvailableTargets(): string[] {
  return Object.keys(TARGETS);
}

/**
 * Get target configuration by name
 * 根据名称获取目标配置
 * 
 * @param name - Target configuration name / 目标配置名称
 * @returns Target configuration or undefined / 目标配置或 undefined
 */
export function getTarget(name: string): TargetConfig | undefined {
  return TARGETS[name];
}

/**
 * Get target configuration by name (alias for getTarget)
 * 根据名称获取目标配置（getTarget 的别名）
 * 
 * @param name - Target configuration name / 目标配置名称
 * @returns Target configuration or undefined / 目标配置或 undefined
 */
export function getTargetByName(name: string): TargetConfig | undefined {
  return getTarget(name);
}

/**
 * List all target configurations (alias for getAllTargets)
 * 列出所有目标配置（getAllTargets 的别名）
 * 
 * @returns Array of all target configurations / 所有目标配置的数组
 */
export function listTargets(): TargetConfig[] {
  return getAllTargets();
}

/**
 * Get all target configurations
 * 获取所有目标配置
 * 
 * @returns Array of all target configurations / 所有目标配置的数组
 */
export function getAllTargets(): TargetConfig[] {
  return Object.values(TARGETS);
}

/**
 * Filter targets by specified criteria
 * 根据指定条件筛选目标
 * 
 * @param filter - Filter criteria / 筛选条件
 * @param filter.language - Language code filter / 语言代码筛选
 * @param filter.architecture - Architecture filter / 架构筛选
 * @param filter.editions - Editions filter / 版本筛选
 * @returns Filtered array of target configurations / 筛选后的目标配置数组
 */
export function filterTargets(filter: {
  language?: LanguageCode;
  architecture?: Architecture;
  editions?: WindowsEdition[];
}): TargetConfig[] {
  return getAllTargets().filter(target => {
    // Filter by language / 按语言筛选
    if (filter.language && target.language !== filter.language) {
      return false;
    }
    // Filter by architecture / 按架构筛选
    if (filter.architecture && target.architecture !== filter.architecture) {
      return false;
    }
    // Filter by editions / 按版本筛选
    if (filter.editions && !filter.editions.some(edition => target.editions.includes(edition))) {
      return false;
    }
    return true;
  });
}