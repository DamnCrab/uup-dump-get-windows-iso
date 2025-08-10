import { TargetConfig, LanguageCode, WindowsEdition, Architecture } from '../types/index.js';

/**
 * 预定义的Windows ISO构建目标配置
 */
export const TARGETS: Record<string, TargetConfig> = {
  // Windows 11 24H2 中文简体
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

  // ARM64 版本
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

  // 企业版配置
  'windows-11-24h2-zh-cn-enterprise': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 中文简体企业版',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体企业版',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'enterprise',
    editions: ['professional'], // 基础SKU
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: ['enterprise'] // 虚拟升级到企业版
    }
  },

  // 教育版配置
  'windows-11-24h2-zh-cn-education': {
    id: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    name: 'Windows 11 24H2 中文简体教育版',
    description: 'Windows 11 Version 24H2 (26100.4770) amd64 中文简体教育版',
    buildId: '1116eb92-418b-4015-ba21-3d34d586b0ab',
    search: 'category:w11-24h2',
    lang: 'zh-cn',
    language: 'zh-cn',
    edition: 'education',
    editions: ['professional'],
    architecture: 'amd64',
    downloadConfig: {
      autodl: '2',
      updates: true,
      cleanup: false,
      netfx: false,
      esd: false,
      virtualEditions: ['education']
    }
  }
};

/**
 * 获取所有可用的目标名称
 */
export function getAvailableTargets(): string[] {
  return Object.keys(TARGETS);
}

/**
 * 根据名称获取目标配置
 */
export function getTarget(name: string): TargetConfig | undefined {
  return TARGETS[name];
}

/**
 * 根据名称获取目标配置（别名）
 */
export function getTargetByName(name: string): TargetConfig | undefined {
  return getTarget(name);
}

/**
 * 列出所有目标配置
 */
export function listTargets(): TargetConfig[] {
  return getAllTargets();
}

/**
 * 获取所有目标配置
 */
export function getAllTargets(): TargetConfig[] {
  return Object.values(TARGETS);
}

/**
 * 根据条件筛选目标
 */
export function filterTargets(filter: {
  language?: LanguageCode;
  architecture?: Architecture;
  editions?: WindowsEdition[];
}): TargetConfig[] {
  return getAllTargets().filter(target => {
    if (filter.language && target.language !== filter.language) {
      return false;
    }
    if (filter.architecture && target.architecture !== filter.architecture) {
      return false;
    }
    if (filter.editions && !filter.editions.some(edition => target.editions.includes(edition))) {
      return false;
    }
    return true;
  });
}