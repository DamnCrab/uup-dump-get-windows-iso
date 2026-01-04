import { BuildRule } from '../types';

export const rules: BuildRule[] = [
    {
        name: "Win11_24H2_x64_Latest",
        category: "w11-24h2",
        titlePattern: /^Windows 11, version 24H2/, // Strict match for release versions / 严格匹配发布版本
        arch: "x64",
        language: "zh-cn",
        editions: ["PROFESSIONAL", "CORE"],
        virtualEditions: ["Enterprise"], // Example: build Enterprise / 示例：构建企业版
        downloadMethod: "3", // Required for virtual editions / 虚拟版本需要此选项
        options: ["updates", "cleanup", "netfx", "esd"]
    }
];
