import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const targetZip = path.join(rootDir, 'ChronosFlow_时流_作业交付与完整源码包_v1.0.zip');
const stagingDir = path.join(rootDir, 'ChronosFlow');

console.log('[1/4] 正在准备打包清单...');

if (fs.existsSync(stagingDir)) {
  execSync(`python "C:/Users/Citrus/.gemini/config/plugins/safe-recycle/scripts/recycle.py" "${stagingDir}"`);
}
fs.mkdirSync(stagingDir, { recursive: true });

const itemsToCopy = [
  'dist',
  'document',
  'public',
  'scripts',
  'src',
  'tests',
  '.gitignore',
  '.oxlintrc.json',
  'AGENTS.md',
  'index.html',
  'package.json',
  'pnpm-lock.yaml',
  'README.md',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  '【创建桌面快捷方式】.bat',
  '【双击启动ChronosFlow】.bat',
  '作业提交与快速运行说明.txt'
];

console.log('[2/4] 正在复制源代码与文档产物到导出版...');
for (const item of itemsToCopy) {
  const src = path.join(rootDir, item);
  const dest = path.join(stagingDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

if (fs.existsSync(targetZip)) {
  execSync(`python "C:/Users/Citrus/.gemini/config/plugins/safe-recycle/scripts/recycle.py" "${targetZip}"`);
}

console.log('[3/4] 正在调用 Windows Zip 引擎生成优化压缩包...');
const psCompressCmd = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stagingDir}', '${targetZip}', [System.IO.Compression.CompressionLevel]::Optimal, $true)`;
execSync(`powershell -NoProfile -Command "${psCompressCmd}"`);

console.log('[4/4] 正在安全清理临时缓存目录...');
// 确保 Windows 异步文件系统缓冲刷盘完毕
execSync(`python "C:/Users/Citrus/.gemini/config/plugins/safe-recycle/scripts/recycle.py" "${stagingDir}"`);

const stats = fs.statSync(targetZip);
console.log('============================================================');
console.log('🎉 恭喜！作业与完整源码包已成功打包完成！');
console.log(`📦 压缩包文件名: ${path.basename(targetZip)}`);
console.log(`📂 存放完整路径: ${targetZip}`);
console.log(`📊 压缩包总大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log('💡 说明: 该压缩包内含 ChronosFlow/ 根目录，解压后包含全部源代码、');
console.log('   构建产物 dist/、完整使用说明书以及一键启动脚本，可直接发送！');
console.log('============================================================');
