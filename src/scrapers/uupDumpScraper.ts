import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import Logger from '../utils/logger.js';
import { 
    Scraper, 
    BuildInfo, 
    LanguageInfo, 
    EditionInfo, 
    DownloadInfo, 
    DownloadLink, 
    LanguageCode, 
    WindowsEdition, 
    DownloadConfig,
    Architecture
} from '../types/index.js';

class UupDumpScraper implements Scraper {
    private baseUrl: string;
    private logger: Logger;
    private axiosConfig: any;

    constructor() {
        this.logger = new Logger('UupDumpScraper');
        this.baseUrl = 'https://uupdump.net';
        
        // 配置axios默认请求头
        this.axiosConfig = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000
        };
    }

    /**
     * 获取可用的构建列表
     * @returns {Promise<BuildInfo[]>} 构建列表
     */
    async getAvailableBuilds(): Promise<BuildInfo[]> {
        return this.getBuilds('category:w11-24h2');
    }

    /**
     * 获取指定类别的构建列表
     * @param {string} category - 类别查询参数 (如: category:w11-24h2)
     * @returns {Promise<BuildInfo[]>} 构建列表
     */
    async getBuilds(category: string = 'category:w11-24h2'): Promise<BuildInfo[]> {
        try {
            const url = `${this.baseUrl}/known.php?q=${encodeURIComponent(category)}`;
            this.logger.info(`正在获取构建列表: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            const builds: BuildInfo[] = [];
            
            // 解析表格数据
            $('table tbody tr').each((index, element) => {
                const $row = $(element);
                const $cells = $row.find('td');
                
                if ($cells.length >= 3) {
                    const titleCell = $cells.eq(0);
                    const archCell = $cells.eq(1);
                    const dateCell = $cells.eq(2);
                    
                    const $link = titleCell.find('a');
                    if ($link.length > 0) {
                        const href = $link.attr('href');
                        const title = $link.text().trim();
                        const arch = archCell.text().trim();
                        const date = dateCell.text().trim();
                        
                        // 从链接中提取构建ID
                        const buildId = href ? this.extractBuildId(href) : null;
                        
                        if (buildId && title && arch && href) {
                            builds.push({
                                id: buildId,
                                title: title,
                                architecture: (arch === 'x64' ? 'x64' : arch === 'x86' ? 'x86' : arch === 'arm64' ? 'arm64' : 'x64') as Architecture,
                                version: date,
                                language: 'en-us' as LanguageCode,
                                link: href.startsWith('http') ? href : `${this.baseUrl}/${href}`
                            });
                        }
                    }
                }
            });
            
            this.logger.info(`找到 ${builds.length} 个构建`);
            return builds;
        } catch (error: any) {
            this.logger.error(`获取构建列表失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取指定构建的语言选项
     * @param {string} buildId - 构建ID
     * @returns {Promise<LanguageInfo[]>} 语言选项列表
     */
    async getLanguages(buildId: string): Promise<LanguageInfo[]> {
        try {
            const url = `${this.baseUrl}/selectlang.php?id=${buildId}`;
            this.logger.info(`正在获取语言选项: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            const languages: LanguageInfo[] = [];
            
            // 解析语言选择下拉框
            $('select option').each((index, element) => {
                const $option = $(element);
                const langCode = $option.attr('value') as string;
                const langName = $option.text().trim();
                
                if (langCode && langName) {
                    languages.push({
                        code: langCode as LanguageCode,
                        name: langName,
                        url: `${this.baseUrl}/selectlang.php?id=${buildId}&pack=${langCode}`
                    });
                }
            });
            
            this.logger.info(`找到 ${languages.length} 种语言`);
            return languages;
        } catch (error: any) {
            this.logger.error(`获取语言选项失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取指定构建和语言的版本选项
     * @param {string} buildId - 构建ID
     * @param {string} langCode - 语言代码
     * @returns {Promise<EditionInfo[]>} 版本选项列表
     */
    async getEditions(buildId: string, langCode: string): Promise<EditionInfo[]> {
        try {
            const url = `${this.baseUrl}/selectedition.php?id=${buildId}&pack=${langCode}`;
            this.logger.info(`正在获取版本选项: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            const editions: EditionInfo[] = [];
            
            // 解析版本选择复选框
            $('input[type="checkbox"][name="edition[]"]').each((index, element) => {
                const $checkbox = $(element);
                const value = $checkbox.attr('value') as string;
                const $label = $checkbox.siblings('label');
                const name = $label.text().trim();
                
                if (value && name) {
                    editions.push({
                        name: name,
                        value: value as WindowsEdition,
                        code: value.toLowerCase() as string
                    });
                }
            });
            
            this.logger.info(`找到 ${editions.length} 个版本`);
            return editions;
        } catch (error: any) {
            this.logger.error(`获取版本选项失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取下载信息
     * @param {string} buildId - 构建ID
     * @param {string} langCode - 语言代码
     * @param {string} editions - 版本字符串 (如: PROFESSIONAL)
     * @returns {Promise<DownloadInfo>} 下载信息
     */
    async getDownloadInfo(buildId: string, langCode: string, editions: string): Promise<DownloadInfo> {
        try {
            const url = `${this.baseUrl}/download.php?id=${buildId}&pack=${langCode}&edition=${editions}`;
            this.logger.info(`正在获取下载信息: ${url}`);
            
            const response = await axios.get(url, this.axiosConfig);
            const $ = cheerio.load(response.data);
            
            // 查找表单并提取表单数据
            const form = $('form').first();
            if (form.length === 0) {
                throw new Error('未找到下载表单');
            }
            
            const formAction = form.attr('action');
            if (!formAction) {
                throw new Error('未找到表单action');
            }
            
            // 构建表单数据，包含所有默认选中的选项
            const formData = new URLSearchParams();
            
            // 下载方式选择 (默认选中aria2)
            formData.append('autodl', '2');
            
            // 包含更新 (默认选中)
            formData.append('updates', '1');
            
            // 其他默认选中的虚拟版本
            const virtualEditions = [
                'ProfessionalWorkstation',
                'ProfessionalEducation', 
                'Education',
                'Enterprise',
                'ServerRdsh',
                'IoTEnterprise',
                'IoTEnterpriseK'
            ];
            
            virtualEditions.forEach(edition => {
                formData.append('virtualEditions[]', edition);
            });
            
            // 提交表单创建下载包
            const formUrl = formAction.startsWith('http') ? formAction : `${this.baseUrl}/${formAction}`;
            this.logger.info(`提交下载表单: ${formUrl}`);
            
            const formResponse = await axios.post(formUrl, formData, {
                ...this.axiosConfig,
                headers: {
                    ...this.axiosConfig.headers,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                responseType: 'arraybuffer' // 处理二进制响应
            });
            
            // 检查响应类型
            const contentType = formResponse.headers['content-type'] || '';
            const downloadLinks = [];
            
            this.logger.info(`响应Content-Type: ${contentType}`);
            this.logger.info(`响应数据长度: ${formResponse.data.length}`);
            
            if (contentType.includes('application/zip') || contentType.includes('application/octet-stream') || 
                contentType.includes('archive/zip') || 
                (formResponse.data.length > 1000 && !contentType.includes('text/html'))) {
                // 直接返回ZIP文件
                this.logger.info('服务器直接返回ZIP文件');
                downloadLinks.push({
                    text: 'UUP下载包',
                    url: formUrl,
                    isDirectDownload: true,
                    data: formResponse.data
                });
            } else {
                // 返回HTML页面，查找下载链接
                const $result = cheerio.load(formResponse.data.toString());
                
                $result('a[href$=".zip"]').each((index, element) => {
                    const $link = $result(element);
                    const href = $link.attr('href');
                    const text = $link.text().trim();
                    
                    if (href && text) {
                        downloadLinks.push({
                            text: text,
                            url: href.startsWith('http') ? href : `${this.baseUrl}/${href}`
                        });
                    }
                });
            }

            // 获取构建信息
            const buildInfo = this.extractBuildInfo($);
            
            return {
                buildId: buildId,
                language: langCode,
                version: buildInfo?.version || 'Unknown',
                downloadLinks,
                buildInfo
            };
        } catch (error: any) {
            this.logger.error(`获取下载信息失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 从URL中提取构建ID
     * @param {string} url - URL字符串
     * @returns {string|null} 构建ID
     */
    extractBuildId(url: string): string | null {
        const match = url.match(/id=([a-f0-9-]+)/);
        return match ? match[1] || null : null;
    }

    /**
     * 从页面中提取构建信息
     * @param {Object} $ - Cheerio对象
     * @returns {Object} 构建信息
     */
    extractBuildInfo($: any): any {
        const info: { [key: string]: string } = {};
        
        $('table tr').each((index: number, element: any) => {
            const $row = $(element);
            const cells = $row.find('td');
            
            if (cells.length >= 2) {
                const key = $(cells[0]).text().trim();
                const value = $(cells[1]).text().trim();
                
                if (key && value) {
                    info[key] = value;
                }
            }
        });
        
        return info;
    }

    /**
     * 过滤构建列表
     * @param {Array} builds - 构建列表
     * @param {Object} criteria - 过滤条件
     * @returns {Array} 过滤后的构建列表
     */
    filterBuilds(builds: BuildInfo[], criteria: any = {}): BuildInfo[] {
        return builds.filter(build => {
            // 排除Preview构建
            if (build.title.toLowerCase().includes('preview')) {
                return false;
            }
            
            // 检查语言支持
            if (criteria.lang && !build.title.toLowerCase().includes(criteria.lang.toLowerCase())) {
                return false;
            }
            
            // 检查版本支持
            if (criteria.edition && !build.title.toLowerCase().includes(criteria.edition.toLowerCase())) {
                return false;
            }
            
            return true;
        });
    }
}

export default UupDumpScraper;