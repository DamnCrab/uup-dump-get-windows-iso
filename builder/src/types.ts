export type UupLanguage =
    | "ar-sa" | "bg-bg" | "cs-cz" | "da-dk" | "de-de" | "el-gr" | "en-gb" | "en-us"
    | "es-es" | "es-mx" | "et-ee" | "fi-fi" | "fr-ca" | "fr-fr" | "he-il" | "hr-hr"
    | "hu-hu" | "it-it" | "ja-jp" | "ko-kr" | "lt-lt" | "lv-lv" | "nb-no" | "neutral"
    | "nl-nl" | "pl-pl" | "pt-br" | "pt-pt" | "ro-ro" | "ru-ru" | "sk-sk" | "sl-si"
    | "sr-latn-rs" | "sv-se" | "th-th" | "tr-tr" | "uk-ua" | "zh-cn" | "zh-tw";

export type UupEdition =
    | "WNC"
    | "CORE" // Home / 家庭版
    | "CORECOUNTRYSPECIFIC" // Home China / 家庭中文版
    | "PROFESSIONAL" // Professional / 专业版
    | "PPIPRO" // Professional for Workstations
    | "SERVERSTANDARD" // Server Standard
    | "SERVERDATACENTER" // Server Datacenter
    | "SERVERSTANDARDCORE" // Server Standard (Desktop Experience)
    | "SERVERDATACENTERCORE"; // Server Datacenter (Desktop Experience)

export type UupOption = "updates" | "cleanup" | "netfx" | "esd";

export type UupDownloadMethod = "1" | "2" | "3";

export type UupVirtualEdition =
    | "CoreSingleLanguage"
    | "ProfessionalWorkstation"
    | "ProfessionalEducation"
    | "Education"
    | "Enterprise"
    | "ServerRdsh"
    | "IoTEnterprise"
    | "IoTEnterpriseK";

export interface BuildRule {
    name: string;              // Unique name for the rule / 规则唯一名称
    category: string;          // Category file to check (e.g. "w11-24h2") / 要检查的类别文件
    titlePattern: RegExp;      // Regex to match title (e.g. /^Windows 11/) / 标题匹配正则
    arch: "x64" | "arm64";     // Architecture / 架构
    language: UupLanguage;     // Language code / 语言代码
    editions: UupEdition[];    // Base editions / 基础版本
    virtualEditions?: UupVirtualEdition[]; // Virtual editions to build / 要构建的虚拟版本
    options?: UupOption[];     // Build options / 构建选项
    downloadMethod: UupDownloadMethod; // Download method / 下载方式
}

export interface BuildTask {
    buildId: string;
    rule: BuildRule;
}
