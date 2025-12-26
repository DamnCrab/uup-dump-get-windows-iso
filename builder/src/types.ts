export type UupLanguage =
    | "ar-sa" | "bg-bg" | "cs-cz" | "da-dk" | "de-de" | "el-gr" | "en-gb" | "en-us"
    | "es-es" | "es-mx" | "et-ee" | "fi-fi" | "fr-ca" | "fr-fr" | "he-il" | "hr-hr"
    | "hu-hu" | "it-it" | "ja-jp" | "ko-kr" | "lt-lt" | "lv-lv" | "nb-no" | "neutral"
    | "nl-nl" | "pl-pl" | "pt-br" | "pt-pt" | "ro-ro" | "ru-ru" | "sk-sk" | "sl-si"
    | "sr-latn-rs" | "sv-se" | "th-th" | "tr-tr" | "uk-ua" | "zh-cn" | "zh-tw";

export type UupEdition =
    | "WNC"
    | "CORE"
    | "CORECOUNTRYSPECIFIC"
    | "PROFESSIONAL"
    | "PPIPRO";

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
    name: string;              // Unique name for the rule
    category: string;          // Category file to check (e.g. "w11-24h2")
    titlePattern: RegExp;      // Regex to match title (e.g. /^Windows 11/)
    arch: "x64" | "arm64";
    language: UupLanguage;
    editions: UupEdition[];
    virtualEditions?: UupVirtualEdition[];
    options?: UupOption[];
    downloadMethod: UupDownloadMethod;
}

export interface BuildTask {
    buildId: string;
    rule: BuildRule;
}
