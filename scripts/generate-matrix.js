#!/usr/bin/env node

/**
 * Generate GitHub Actions Matrix Configuration
 * 生成 GitHub Actions Matrix 配置
 * 
 * This script generates the matrix configuration for GitHub Actions workflow
 * based on the TARGETS defined in src/config/targets.ts
 * 
 * 此脚本根据 src/config/targets.ts 中定义的 TARGETS 生成 GitHub Actions 工作流的 matrix 配置
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read targets configuration
// 读取目标配置
const targetsPath = join(__dirname, '../src/config/targets.ts');
const targetsContent = readFileSync(targetsPath, 'utf-8');

// Extract target keys using regex (simple approach)
// 使用正则表达式提取目标键（简单方法）
const targetKeyRegex = /['"]([^'"]+)['"]:\s*{/g;
const targetKeys = [];
let match;

while ((match = targetKeyRegex.exec(targetsContent)) !== null) {
  targetKeys.push(match[1]);
}

console.log('# GitHub Actions Matrix Configuration');
console.log('# GitHub Actions Matrix 配置');
console.log('# Generated from src/config/targets.ts');
console.log('# 从 src/config/targets.ts 生成');
console.log('');
console.log('matrix:');
console.log('  include:');

targetKeys.forEach(key => {
  console.log(`    - name: ${key}`);
});

console.log('');
console.log(`# Total targets: ${targetKeys.length}`);
console.log(`# 总目标数: ${targetKeys.length}`);