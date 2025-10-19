import * as fs from 'fs';
import * as path from 'path';
import { AtlasData, AtlasRegion } from './types';

// Spine library setup (same as in spine-screenshot.ts)
// DOM環境をシミュレート（Spineライブラリがブラウザー機能を要求するため）
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = dom.window.navigator;

// Internet Explorerの古いメソッドを追加（Spineライブラリが要求するため）
if ((global as any).document) {
  (global as any).document.attachEvent = function(event: string, handler: Function) {
    // IE互換のダミー実装 - 何もしない
    return true;
  };
  (global as any).document.detachEvent = function(event: string, handler: Function) {
    // IE互換のダミー実装 - 何もしない  
    return true;
  };
}

// THREE.jsを設定（Spineライブラリの依存関係のため）
(global as any).THREE = require('three');

// Spine library for atlas parsing
let spine: any;
try {
  // vm moduleを使ってspine-core.jsを実行
  const vm = require('vm');
  const spineCorePath = require.resolve('@esotericsoftware/spine-core/spine-ts/build/spine-core.js');
  const spineCode = fs.readFileSync(spineCorePath, 'utf8');
  
  // 新しいコンテキストでSpineライブラリを実行
  const context = vm.createContext({
    console: console,
    module: {},
    exports: {},
    require: require,
    global: global,
    __dirname: __dirname,
    __filename: __filename
  });
  
  // spine-core.jsを実行
  vm.runInContext(spineCode, context);
  
  // spineオブジェクトを取得
  spine = context.spine;
  
  if (spine) {
    console.log('✅ Atlas Parser: Spine core library loaded successfully');
  } else {
    console.log('⚠️  Atlas Parser: Spine core library loaded but spine object is null');
  }
} catch (error) {
  console.warn('⚠️  Atlas Parser: Failed to load Spine core library:', error);
  spine = null;
}

/**
 * Spine Atlas ファイルを解析するクラス
 */
export class AtlasParser {
  /**
   * Atlas テキストファイルを解析して、画像、リージョン、スキン情報を取得する
   * @param atlasText - Atlas ファイルの内容
   * @param atlasDir - Atlas ファイルが存在するディレクトリのパス
   * @returns 解析されたAtlasデータ
   */
  static parseAtlasData(atlasText: string, atlasDir: string): AtlasData {
    console.log('🔍 Starting atlas parsing with Spine library first...');
    
    // Spineライブラリを最初に試行
    if (spine && spine.TextureAtlas) {
      try {
        console.log('🎯 Attempting Spine library parsing as primary method...');
        return AtlasParser.parseWithSpineLibrary(atlasText, atlasDir);
      } catch (error) {
        console.warn('⚠️  Spine library parsing failed, falling back to manual parsing:', error);
      }
    } else {
      console.log('⚠️  Spine library not available, using manual parsing');
    }
    
    // フォールバック: 手動解析
    console.log('🔧 Falling back to proven manual parsing method...');
    return AtlasParser.parseManually(atlasText, atlasDir);
  }

  /**
   * 手動でのAtlas解析（フォールバック）
   */
  private static parseManually(atlasText: string, atlasDir: string): AtlasData {
    console.log('🔍 Using manual atlas parsing...');
    const lines = atlasText.split('\n');
    console.log(`📝 Atlas has ${lines.length} lines`);
    const images: string[] = [];
    const regions: AtlasRegion[] = [];
    const skins = new Set<string>();
    
    let currentImage = '';
    let currentRegion: AtlasRegion | null = null;
    let lineCount = 0;
    
    skins.add('default'); // デフォルトスキンを追加
    
    for (const line of lines) {
      lineCount++;
      if (lineCount % 50 === 0) {
        console.log(`📊 Processing line ${lineCount}/${lines.length}`);
      }
      const trimmedLine = line.trim();
      
      // 画像ファイルを検出
      if (trimmedLine.match(/\.(png|jpg|jpeg)$/i)) {
        currentImage = trimmedLine; // 相対パスとして保存
        const fullPath = path.resolve(atlasDir, trimmedLine);
        if (fs.existsSync(fullPath)) {
          images.push(trimmedLine); // 相対パスを配列に追加
          console.log(`📋 Found atlas image: ${trimmedLine} -> ${fullPath}`);
        } else {
          console.warn(`⚠️  Atlas image not found: ${fullPath}`);
        }
      }
      // リージョン情報を解析
      else if (trimmedLine && !trimmedLine.startsWith('size:') && !trimmedLine.startsWith('format:') && 
               !trimmedLine.startsWith('filter:') && !trimmedLine.startsWith('repeat:')) {
        // 新しいリージョンの開始
        if (!trimmedLine.includes(':')) {
          // スキン名をリージョン名から抽出（例: "anger/eyeOpen" -> "anger"）
          if (trimmedLine.includes('/')) {
            const skinName = trimmedLine.split('/')[0];
            skins.add(skinName);
          }
          
          currentRegion = {
            name: trimmedLine,
            image: currentImage,
            x: 0, y: 0, width: 100, height: 100,
            rotate: false
          };
          regions.push(currentRegion);
        }
        // リージョンのプロパティ
        else if (currentRegion && trimmedLine.includes(':')) {
          const [key, value] = trimmedLine.split(':').map(s => s.trim());
          
          if (key === 'xy') {
            const [x, y] = value.split(',').map(s => parseInt(s.trim()));
            currentRegion.x = x;
            currentRegion.y = y;
          } else if (key === 'size') {
            const [w, h] = value.split(',').map(s => parseInt(s.trim()));
            currentRegion.width = w;
            currentRegion.height = h;
          } else if (key === 'rotate') {
            currentRegion.rotate = value === 'true';
          }
        }
      }
    }
    
    console.log(`✅ Manual atlas parsing completed: ${images.length} images, ${regions.length} regions`);
    console.log(`🎭 Found skins from atlas: ${Array.from(skins).join(', ')}`);
    return { images, regions, skins: Array.from(skins) };
  }

  /**
   * Spineライブラリを使用したAtlas解析
   */
  private static parseWithSpineLibrary(atlasText: string, atlasDir: string): AtlasData {
    console.log('🎯 Using Spine TextureAtlas for parsing...');
    
    const images: string[] = [];
    const regions: AtlasRegion[] = [];
    const skins = new Set<string>();
    
    // デフォルトスキンを追加
    skins.add('default');
    
    const assettManager = new spine.AssetManager();
    assettManager.loadText()


    try {
      // MockなTextureLoader関数を作成（実際のテクスチャ読み込みは不要）
      const mockTextureLoader = (page: any, path: string | undefined) => {
        console.log(`📋 Spine TextureLoader called - page:`, page, `path: "${path}"`);
        
        // pageが実際のファイル名の場合がある
        let imagePath: string;
        if (typeof page === 'string') {
          imagePath = page;
          console.log(`📋 Using page as image path: "${imagePath}"`);
        } else if (typeof path === 'string') {
          imagePath = path;
          console.log(`📋 Using path as image path: "${imagePath}"`);
        } else {
          console.warn(`⚠️  No valid image path found, page:`, page, 'path:', path);
          return {
            dispose: () => {},
            width: 1024,
            height: 1024,
            name: 'unknown',
            setFilters: () => {},
            setWraps: () => {},
            getImage: () => null
          };
        }
        
        const fullPath = require('path').resolve(atlasDir, imagePath);
        if (fs.existsSync(fullPath)) {
          if (!images.includes(imagePath)) {
            images.push(imagePath);
          }
          console.log(`✅ Found atlas image via Spine: ${imagePath} -> ${fullPath}`);
        } else {
          console.warn(`⚠️  Atlas image not found: ${fullPath}`);
        }
        
        // Mockのtextureオブジェクトを返す（必要なプロパティを含む）
        return {
          dispose: () => {},
          width: 1024,
          height: 1024,
          name: imagePath,
          setFilters: () => {},
          setWraps: () => {},
          getImage: () => null
        };
      };
      
      // Spine TextureAtlasを作成
      const textureAtlas = new spine.TextureAtlas(atlasText, mockTextureLoader);
      
      // TextureAtlasからリージョン情報を取得
      if (textureAtlas.regions) {
        const regionArray = Array.isArray(textureAtlas.regions) ? textureAtlas.regions : [textureAtlas.regions];
        
        regionArray.forEach((region: any) => {
          if (region) {
            // スキン名をリージョン名から抽出
            if (region.name && region.name.includes('/')) {
              const skinName = region.name.split('/')[0];
              skins.add(skinName);
            }
            
            // AtlasRegionオブジェクトを作成
            const atlasRegion: AtlasRegion = {
              name: region.name || 'unknown',
              image: region.page ? region.page.name : '',
              x: region.x || 0,
              y: region.y || 0,
              width: region.width || 0,
              height: region.height || 0,
              rotate: region.rotate || false
            };
            
            regions.push(atlasRegion);
            console.log(`✅ Spine region: ${atlasRegion.name} (${atlasRegion.width}x${atlasRegion.height})`);
          }
        });
      }
      
      // pages からも画像情報を取得
      if (textureAtlas.pages) {
        const pageArray = Array.isArray(textureAtlas.pages) ? textureAtlas.pages : [textureAtlas.pages];
        pageArray.forEach((page: any) => {
          if (page && page.name && !images.includes(page.name)) {
            images.push(page.name);
          }
        });
      }
      
      console.log(`✅ Spine library atlas parsing completed: ${images.length} images, ${regions.length} regions`);
      console.log(`🎭 Found skins from atlas: ${Array.from(skins).join(', ')}`);
      
      return { images, regions, skins: Array.from(skins) };
      
    } catch (error) {
      console.error('❌ Error in Spine library atlas parsing:', error);
      throw error;
    }
  }
}