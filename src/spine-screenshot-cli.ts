#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { SpineExtractor } from './spine-screenshot';

interface CliOptions {
  atlas: string;
  skel: string;
  skin?: string;
  anime?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  scale?: number;
  frame?: number;
  output?: string;
}

export function createCLI(): Command {
  const program = new Command();

  program
    .name('spine-extractor')
    .description('Spine 2D atlas and skel file screenshot CLI tool')
    .version('1.0.0')
    .requiredOption('--atlas <path>', 'Path to atlas file')
    .requiredOption('--skel <path>', 'Path to skel file')
    .option('--skin <name>', 'Skin name')
    .option('--anime <name>', 'Animation name')
    .option('--x <number>', 'X position for image display', '0')
    .option('--y <number>', 'Y position for image display', '0')
    .option('--w <number>', 'Image width', '1000')
    .option('--h <number>', 'Image height', '1000')
    .option('--scale <number>', 'Scale factor', '1.0')
    .option('--frame <number>', 'Frame number to capture', '1')
    .option('-o, --output <dir>', 'Output directory', './out')
    .action(async (options: CliOptions) => {
      try {
        const extractor = new SpineExtractor({
          atlasPath: options.atlas,
          skelPath: options.skel,
          skin: options.skin,
          animation: options.anime,
          x: parseInt(options.x?.toString() || '0'),
          y: parseInt(options.y?.toString() || '0'),
          width: parseInt(options.w?.toString() || '1000'),
          height: parseInt(options.h?.toString() || '1000'),
          scale: parseFloat(options.scale?.toString() || '1.0'),
          frame: parseInt(options.frame?.toString() || '1')
        });

        const imageBuffer = await extractor.extract();
        const outputDir = options.output || './out';
        
        // 出力ディレクトリを作成（存在しない場合）
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(`Created output directory: ${outputDir}`);
        }
        
        // ファイル名を自動生成（atlasファイル名 + アニメーション + フレーム）
        const atlasBaseName = path.basename(options.atlas, '.atlas');
        const animationName = options.anime || 'default';
        const frameNumber = options.frame || 1;
        const fileName = `${atlasBaseName}_${animationName}_frame${frameNumber}.png`;
        const outputPath = path.join(outputDir, fileName);
        
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`Screenshot saved to: ${outputPath}`);
      } catch (error) {
        console.error('Error:', error);
        process.exit(1);
      }
    });

  return program;
}

export function runCLI(): void {
  const program = createCLI();
  program.parse();
}