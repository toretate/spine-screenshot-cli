import { Canvas } from 'skia-canvas';
import * as fs from 'fs';
import * as path from 'path';

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
    // TODO: Spine 3.6 ライブラリを使用してSpineデータを読み込み
    // TODO: 指定されたスキンとアニメーションを設定
    // TODO: 指定されたフレームでの描画を実行
    // 
    // 現時点では基本的な描画のプレースホルダー
    this.ctx.save();
    this.ctx.translate(this.options.x + this.options.width / 2, this.options.y + this.options.height / 2);
    this.ctx.scale(this.options.scale, this.options.scale);
    
    // プレースホルダー描画（実際のSpine描画に置き換える予定）
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(-50, -50, 100, 100);
    this.ctx.fillStyle = 'blue';
    this.ctx.fillRect(-25, -25, 50, 50);
    
    this.ctx.restore();

    console.log(`Loaded Spine data from: ${atlasPath}, ${skelPath}`);
    console.log(`Options: skin=${this.options.skin}, animation=${this.options.animation}, frame=${this.options.frame}`);
  }

  private async saveImage(): Promise<void> {
    const buffer = await this.canvas.toBuffer('png');
    fs.writeFileSync(this.options.outputPath, buffer);
  }
}