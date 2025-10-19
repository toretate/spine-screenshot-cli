#!/usr/bin/env node

import { Command } from 'commander';
import { SpineExtractor } from './spine-extractor';

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
  .option('-o, --output <path>', 'Output file path', 'output.png')
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
        frame: parseInt(options.frame?.toString() || '1'),
        outputPath: options.output || 'output.png'
      });

      await extractor.extract();
      console.log(`Screenshot saved to: ${options.output || 'output.png'}`);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();