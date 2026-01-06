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
    },
    {
        name: "Win11_25H2_x64",
        category: "w11-25h2",
        titlePattern: /^Windows 11, version 25H2/,
        arch: "x64",
        language: "zh-cn",
        editions: ["PROFESSIONAL", "CORE"],
        virtualEditions: ["Enterprise", "Education", "ProfessionalWorkstation", "IoTEnterprise"],
        downloadMethod: "3",
        options: ["updates", "cleanup", "netfx", "esd"]
    },
    {
        name: "Server_21H2_x64",
        category: "server-21h2",
        titlePattern: /^Feature update to Microsoft server operating system, version 21H2/,
        arch: "x64",
        language: "zh-cn",
        editions: ["SERVERSTANDARD", "SERVERDATACENTER"],
        virtualEditions: [],
        downloadMethod: "2",
        options: ["updates", "cleanup", "netfx", "esd"]
    }
];
