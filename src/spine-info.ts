import * as fs from 'fs';
import * as path from 'path';
import { ExtractorOptions, AtlasData, AtlasRegion } from './types';
import { AtlasParser } from './atlas-parser';
import { SpineExtractor } from './spine-screenshot';

export const showInfo = async ( options: ExtractorOptions): Promise<void> => {
    try {
      console.log(`🎯 Atlas File: ${options.atlasPath}`);
      console.log(`🎯 Skel File: ${options.skelPath}`);
      console.log('');

      // Atlas ファイルの読み込みと解析
      if (!fs.existsSync(options.atlasPath)) {
        throw new Error(`Atlas file not found: ${options.atlasPath}`);
      }
      if (!fs.existsSync(options.skelPath)) {
        throw new Error(`Skel file not found: ${options.skelPath}`);
      }

      const atlasText = fs.readFileSync(options.atlasPath, 'utf8');
      const skelData = fs.readFileSync(options.skelPath);
      const atlasDir = path.dirname(options.atlasPath);

      console.log('🔍 Analyzing Atlas file...');
      const atlasInfo = AtlasParser.parseAtlasData(atlasText, atlasDir);
      
      // SpineExtractorインスタンスを作成
      const spineExtractor = new SpineExtractor(options);
      
      console.log('🔍 Analyzing Skel file...');
      const skelInfo = spineExtractor.parseBasicSkelData(skelData);

      console.log('🔍 Analyzing with Spine library...');
      const spineInfo = spineExtractor.parseSpineData(atlasText, skelData, atlasDir);

      // すべてのソースからのスキン情報をマージ
      const allSkins = new Set([...atlasInfo.skins, ...skelInfo.skins, ...spineInfo.skins]);
      const allAnimations = new Set([...skelInfo.animationNames, ...spineInfo.animations]);

      // Atlas 情報を表示
      console.log('\n📊 ATLAS INFORMATION:');
      console.log(`   📁 Images: ${atlasInfo.images.length}`);
      if (atlasInfo.images.length > 0) {
        atlasInfo.images.forEach((img: string, idx: number) => {
          const fullPath = path.resolve(atlasDir, img);
          const exists = fs.existsSync(fullPath) ? '✅' : '❌';
          console.log(`      ${idx + 1}. ${img} ${exists}`);
        });
      }
      
      console.log(`   🎨 Regions: ${atlasInfo.regions.length}`);
      if (atlasInfo.regions.length > 0) {
        console.log(`   📋 Region names (first 10):`);
        atlasInfo.regions.slice(0, 10).forEach((region: AtlasRegion, idx: number) => {
          console.log(`      ${idx + 1}. ${region.name} (${region.width}x${region.height})`);
        });
        if (atlasInfo.regions.length > 10) {
          console.log(`      ... and ${atlasInfo.regions.length - 10} more regions`);
        }
      }

      // Skel 情報を表示
      console.log('\n📊 SKEL INFORMATION:');
      console.log(`   🦴 Bones: ${skelInfo.bones} (estimated)`);
      console.log(`   🎰 Slots: ${skelInfo.slots} (estimated)`);
      console.log(`   🎬 Animations: ${skelInfo.animations} (estimated)`);
      
      // Spine Library 情報を表示
      if (spineInfo.skins.length > 0 || spineInfo.animations.length > 0) {
        console.log('\n📊 SPINE LIBRARY INFORMATION:');
        if (spineInfo.skins.length > 0) {
          console.log(`   🎭 Skins (from Spine library): ${spineInfo.skins.length}`);
          spineInfo.skins.forEach((skin: string, idx: number) => {
            console.log(`      ${idx + 1}. ${skin} 📚`);
          });
        }
        if (spineInfo.animations.length > 0) {
          console.log(`   🎞️  Animations (from Spine library): ${spineInfo.animations.length}`);
          spineInfo.animations.forEach((anim: string, idx: number) => {
            console.log(`      ${idx + 1}. ${anim} 📚`);
          });
        }
      }

      // 統合された情報を表示
      if (allSkins.size > 0) {
        console.log(`\n📊 CONSOLIDATED INFORMATION:`);
        console.log(`   🎭 All Available Skins (${allSkins.size}):`);
        Array.from(allSkins).forEach((skin: string, idx: number) => {
          const fromAtlas = atlasInfo.skins.includes(skin) ? '📁' : '';
          const fromSkel = skelInfo.skins.includes(skin) ? '🦴' : '';
          const fromSpine = spineInfo.skins.includes(skin) ? '📚' : '';
          console.log(`      ${idx + 1}. ${skin} ${fromAtlas}${fromSkel}${fromSpine}`);
        });
      }
      
      if (allAnimations.size > 0) {
        console.log(`   🎞️  All Available Animations (${allAnimations.size}):`);
        Array.from(allAnimations).forEach((anim: string, idx: number) => {
          const fromSkel = skelInfo.animationNames.includes(anim) ? '🦴' : '';
          const fromSpine = spineInfo.animations.includes(anim) ? '📚' : '';
          console.log(`      ${idx + 1}. ${anim} ${fromSkel}${fromSpine}`);
        });
      }

      console.log(`\n📂 File Sizes:`);
      console.log(`   Atlas: ${(fs.statSync(options.atlasPath).size / 1024).toFixed(1)} KB`);
      console.log(`   Skel: ${(fs.statSync(options.skelPath).size / 1024).toFixed(1)} KB`);

      console.log('\n💡 Usage Examples:');
      console.log(`   Basic: --atlas "${options.atlasPath}" --skel "${options.skelPath}"`);
      if (allSkins.size > 1) {
        const skinArray = Array.from(allSkins);
        const exampleSkin = skinArray.find(s => s !== 'default') || skinArray[0];
        console.log(`   With skin: --skin "${exampleSkin}"`);
      }
      if (allAnimations.size > 0) {
        const animArray = Array.from(allAnimations);
        console.log(`   With animation: --anime "${animArray[0]}"`);
      }

    } catch (error) {
      console.error('❌ Error analyzing Spine files:', error);
    }
  }
