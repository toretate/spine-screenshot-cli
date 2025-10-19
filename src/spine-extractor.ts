import { Canvas } from 'skia-canvas';
import * as fs from 'fs';
import * as path from 'path';

// Node.js環境で Global spine オブジェクトを設定
(global as any).spine = {};

// Spine 3.6 ライブラリのロード
require('@esotericsoftware/spine-core/spine-ts/build/spine-core.js');
require('@esotericsoftware/spine-canvas/spine-ts/build/spine-canvas.js');

// グローバルのspine変数を型なしで使用
declare const spine: any;

export interface ExtractorOptions {
  atlasPath: string;
  skin?: string;
  animation?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  frame: number;
  outputPath: string;
}

export class SpineExtractor {
  private options: ExtractorOptions;
  private canvas: Canvas;
  private ctx: any; // skia-canvasの型との互換性のためanyを使用
  private atlas: any;
  private skeletonData: any;
  private skeleton: any;
  private animationState: any;

  constructor(options: ExtractorOptions) {
    this.options = options;
    this.canvas = new Canvas(options.width, options.height);
    this.ctx = this.canvas.getContext('2d');
  }

  async extract(): Promise<void> {
    try {
      // Atlas ファイルのパスからskelファイルパスを推測
      const atlasDir = path.dirname(this.options.atlasPath);
      const atlasBaseName = path.basename(this.options.atlasPath, '.atlas');
      const skelPath = path.join(atlasDir, `${atlasBaseName}.skel`);

      // ファイルの存在確認
      if (!fs.existsSync(this.options.atlasPath)) {
        throw new Error(`Atlas file not found: ${this.options.atlasPath}`);
      }
      if (!fs.existsSync(skelPath)) {
        throw new Error(`Skel file not found: ${skelPath}`);
      }

      // Canvas初期化
      this.ctx.clearRect(0, 0, this.options.width, this.options.height);
      this.ctx.fillStyle = 'transparent';
      this.ctx.fillRect(0, 0, this.options.width, this.options.height);

      // Spine データの読み込みと描画
      await this.loadAndRenderSpine(this.options.atlasPath, skelPath);

      // 画像として保存
      await this.saveImage();

    } catch (error) {
      throw new Error(`Failed to extract spine animation: ${error}`);
    }
  }

  private async loadAndRenderSpine(atlasPath: string, skelPath: string): Promise<void> {
    try {
      // 一時的に簡単な実装でファイル読み込みをテスト
      console.log(`Loading Spine files: ${atlasPath}, ${skelPath}`);
      
      // Atlas ファイルの読み込み
      const atlasText = fs.readFileSync(atlasPath, 'utf8');
      console.log(`Atlas file loaded, size: ${atlasText.length} characters`);
      
      // Skeleton データの読み込み  
      const skelData = fs.readFileSync(skelPath);
      console.log(`Skel file loaded, size: ${skelData.length} bytes`);
      
      // Atlas ディレクトリから画像パスを取得
      const atlasDir = path.dirname(atlasPath);
      console.log(`Atlas directory: ${atlasDir}`);
      
      // フォールバック描画を実行
      this.renderFallback();
      
      console.log(`Options: skin=${this.options.skin}, animation=${this.options.animation}, frame=${this.options.frame}`);

    } catch (error) {
      throw new Error(`Failed to load Spine data: ${error}`);
    }
  }

  private async renderToCanvas(): Promise<void> {
    try {
      // Canvas の初期化
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.options.width, this.options.height);
      
      // 背景を透明に設定
      this.ctx.globalCompositeOperation = 'source-over';
      
      // 座標系の設定（Spineは左下原点、Canvasは左上原点）
      this.ctx.translate(this.options.x + this.options.width / 2, this.options.y + this.options.height / 2);
      this.ctx.scale(this.options.scale, -this.options.scale); // Y軸を反転
      
      // SkeletonRenderer を作成
      const renderer = new spine.canvas.SkeletonRenderer(this.ctx);
      renderer.triangleRendering = true; // 三角形レンダリングを有効化
      
      // Spine アニメーションを描画
      if (this.skeleton) {
        renderer.draw(this.skeleton);
        console.log('Spine animation rendered to canvas');
      } else {
        throw new Error('Skeleton not loaded');
      }
      
      this.ctx.restore();
      
    } catch (error) {
      console.error('Rendering error:', error);
      // フォールバック描画
      this.renderFallback();
    }
  }

  private renderFallback(): void {
    // Spine描画に失敗した場合のフォールバック描画
    this.ctx.save();
    this.ctx.translate(this.options.x + this.options.width / 2, this.options.y + this.options.height / 2);
    this.ctx.scale(this.options.scale, this.options.scale);
    
    // デバッグ用の矩形描画
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.fillRect(-50, -50, 100, 100);
    this.ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
    this.ctx.fillRect(-25, -25, 50, 50);
    
    // テキスト描画
    this.ctx.fillStyle = 'black';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Spine Render Error', 0, 0);
    
    this.ctx.restore();
    console.log('Fallback rendering applied');
  }

  private async saveImage(): Promise<void> {
    const buffer = await this.canvas.toBuffer('png');
    fs.writeFileSync(this.options.outputPath, buffer);
  }
}