import { Command } from 'commander';
import UupDumpScraper from './scrapers/uupDumpScraper.js';
import WindowsIsoBuilder from './builders/windowsIsoBuilder.js';
import Logger from './utils/logger.js';
import { TARGETS, getTargetByName, listTargets } from './config/targets.js';
import { TargetConfig, BuildResult } from './types/index.js';

const logger = new Logger();

// 目标配置已移至 config/targets.ts

async function main(): Promise<void> {
    const program = new Command();
    const mainLogger = new Logger('Main');

    program
        .name('uup-dump-iso-builder')
        .description('从 UUP Dump 下载并构建 Windows ISO 镜像')
        .version('1.0.0')
        .option('-t, --target <target>', '目标配置名称')
        .option('-o, --output <path>', '输出目录', './output')
        .option('-l, --list', '列出所有可用的目标配置')
        .option('-v, --verbose', '详细输出')
        .parse();

    const options = program.opts() as {
        target?: string;
        output?: string;
        list?: boolean;
        verbose?: boolean;
    };

    if (options.verbose) {
        // 详细模式 - Logger类暂不支持动态设置级别
        mainLogger.debug('启用详细输出模式');
    }

    if (options.list) {
        console.log('\n可用的目标配置:');
        listTargets().forEach((target: TargetConfig) => {
            console.log(`  ${target.id}: ${target.name}`);
            console.log(`    描述: ${target.description}`);
            console.log(`    语言: ${target.language}, 架构: ${target.architecture}`);
            console.log(`    版本: ${target.editions.join(', ')}`);
            console.log('');
        });
        return;
    }

    if (!options.target) {
        console.log('请指定目标配置名称，使用 -t 或 --target 参数');
        console.log('使用 -l 或 --list 查看所有可用的目标配置');
        process.exit(1);
    }

    const targetConfig = getTargetByName(options.target);
    if (!targetConfig) {
        mainLogger.error(`未找到目标配置: ${options.target}`);
        mainLogger.info('使用 -l 或 --list 查看所有可用目标');
        process.exit(1);
    }

    try {
        mainLogger.info(`开始构建: ${targetConfig.name}`);
        mainLogger.info(`输出目录: ${options.output || './output'}`);

        const scraper = new UupDumpScraper();
        const builder = new WindowsIsoBuilder(scraper, options.output || './output');

        const result: BuildResult = await builder.buildIso(targetConfig);

        if (result.success) {
            mainLogger.info(`构建成功!`);
            mainLogger.info(`ISO 文件: ${result.isoPath}`);
        } else {
            mainLogger.error(`构建失败: ${result.error}`);
            process.exit(1);
        }
    } catch (error: any) {
        mainLogger.error('构建过程中发生错误:', error.message);
        process.exit(1);
    }
}

// 主程序入口
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
    main().catch(error => {
        logger.error('程序执行失败:', error);
        process.exit(1);
    });
}