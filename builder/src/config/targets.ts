/**
 * Target Configurations for Windows ISO Building
 * Windows ISO 构建的目标配置
 * 
 * This file contains predefined target configurations for building various Windows ISO files.
 * Each configuration specifies the Windows version, language, SKU, architecture, and download options.
 * 
 * 此文件包含用于构建各种 Windows ISO 文件的预定义目标配置。
 * 每个配置指定 Windows 版本、语言、SKU类型、架构和下载选项。
 */

import { TargetConfig, LanguageCode, WindowsSKU, Architecture } from '../types/index.js';

/**
 * Predefined Windows ISO build target configurations
 * 预定义的 Windows ISO 构建目标配置
 * 
 * Each target configuration includes:
 * - Build ID from UUP Dump
 * - Language and SKU settings
 * - Architecture specification
 * - Download configuration options
 * 
 * 每个目标配置包括：
 * - 来自 UUP Dump 的构建 ID
 * - 语言和 SKU 设置
 * - 架构规格
 * - 下载配置选项
 */
export const TARGETS: Record<string, TargetConfig> = {
  // Windows 10 22H2 Multi Editions / Windows 10 22H2 多版本
  'windows-10-22h2-zh-cn-multi': {
    name: 'Windows 10 22H2 中文简体多版本',
    description: 'Windows 10 Version 22H2 (19045.6456) amd64 中文简体多版本（专业版+虚拟版本）',
    search: 'category:w10-22h2',
    language: 'zh-cn',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  'windows-10-22h2-en-us-multi': {
    name: 'Windows 10 22H2 English US Multi',
    description: 'Windows 10 Version 22H2 (19045.6456) amd64 English US Multi Editions',
    search: 'category:w10-22h2',
    language: 'en-us',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  // Windows 11 25H2 Multi Editions / Windows 11 25H2 多版本
  'windows-11-25h2-zh-cn-multi': {
    name: 'Windows 11 25H2 中文简体多版本',
    description: 'Windows 11 Version 25H2 amd64 中文简体多版本（专业版+虚拟版本）',
    search: 'category:w11-25h2',
    language: 'zh-cn',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  'windows-11-25h2-en-us-multi': {
    name: 'Windows 11 25H2 English US Multi',
    description: 'Windows 11 Version 25H2 amd64 English US Multi Editions',
    search: 'category:w11-25h2',
    language: 'en-us',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  // Windows 11 24H2 Multi Editions / Windows 11 24H2 多版本
  'windows-11-24h2-zh-cn-multi': {
    name: 'Windows 11 24H2 中文简体多版本',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体多版本（专业版+虚拟版本）',
    search: 'category:w11-24h2',
    language: 'zh-cn',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  'windows-11-24h2-en-us-multi': {
    name: 'Windows 11 24H2 English US Multi',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 English US Multi Editions',
    search: 'category:w11-24h2',
    language: 'en-us',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  // Windows 11 Insider Preview Multi Editions / Windows 11 Insider 预览版多版本
  'windows-11-insider-zh-cn-multi': {
    name: 'Windows 11 Insider Preview 中文简体多版本',
    description: 'Windows 11 Insider Preview (Dev Channel) amd64 中文简体多版本',
    search: 'category:w11-25h2-dev',
    language: 'zh-cn',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  'windows-11-insider-en-us-multi': {
    name: 'Windows 11 Insider Preview English US Multi',
    description: 'Windows 11 Insider Preview (Dev Channel) amd64 English US Multi Editions',
    search: 'category:w11-25h2-dev',
    language: 'en-us',
    sku: 'PROFESSIONAL',
    architecture: 'amd64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  // ARM64 Multi Editions / ARM64 多版本
  'windows-11-24h2-zh-cn-arm64-multi': {
    name: 'Windows 11 24H2 中文简体 ARM64 多版本',
    description: 'Windows 11 Version 24H2 (26100.4770) arm64 中文简体多版本',
    search: 'category:w11-24h2',
    language: 'zh-cn',
    sku: 'PROFESSIONAL',
    architecture: 'arm64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  'windows-11-24h2-en-us-arm64-multi': {
    name: 'Windows 11 24H2 English US ARM64 Multi',
    description: 'Windows 11 Version 24H2 (26100.4770) arm64 English US Multi Editions',
    search: 'category:w11-24h2',
    language: 'en-us',
    sku: 'PROFESSIONAL',
    architecture: 'arm64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  'windows-11-25h2-zh-cn-arm64-multi': {
    name: 'Windows 11 25H2 中文简体 ARM64 多版本',
    description: 'Windows 11 Version 25H2 arm64 中文简体多版本',
    search: 'category:w11-25h2',
    language: 'zh-cn',
    sku: 'PROFESSIONAL',
    architecture: 'arm64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
    }
  },

  'windows-11-25h2-en-us-arm64-multi': {
    name: 'Windows 11 25H2 English US ARM64 Multi',
    description: 'Windows 11 Version 25H2 arm64 English US Multi Editions',
    search: 'category:w11-25h2',
    language: 'en-us',
    sku: 'PROFESSIONAL',
    architecture: 'arm64',
    downloadConfig: {
      autodl: '3', // 直接下载，支持虚拟版本
      updates: true,
      cleanup: true,
      netfx: true,
      esd: true,
      virtualEditions: 'all' // 全选所有可用的虚拟版本
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
 * @param filter.sku - SKU filter / SKU筛选
 * @returns Filtered array of target configurations / 筛选后的目标配置数组
 */
export function filterTargets(filter: {
  language?: LanguageCode;
  architecture?: Architecture;
  sku?: WindowsSKU;
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
    // Filter by SKU / 按SKU筛选
    if (filter.sku && target.sku !== filter.sku) {
      return false;
    }
    return true;
  });
}