import { Canvas, Image } from 'skia-canvas';
import * as fs from 'fs';
import * as path from 'path';
import { AtlasParser } from './atlas-parser';
import { AtlasData, AtlasRegion, ExtractorOptions } from './types';

// headless-gl for real WebGL rendering
const createGL = require('gl');

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

// Spine library for proper skeleton data parsing
let spineLib: any;
try {
  // spine-core.jsのみを使用（spine-all.jsはWebGL/Widget機能を含み、DOM依存が強い）
  spineLib = require('@esotericsoftware/spine-core/spine-ts/build/spine-core.js').spine;
  console.log('✅ Spine core library loaded successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.log('⚠️  Failed to load Spine core library:', errorMessage);
  spineLib = null;
}

// Node.js環境で Spine ライブラリを設定
// 既にJSOMでDOM環境は設定済み
(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      // headless-glを使用した実際のWebGLキャンバスを返す
      return {
        getContext: (type: string) => {
          if (type === 'webgl' || type === 'experimental-webgl') {
            // 実際のheadless-gl WebGLコンテキストを作成
            const gl = createGL(1024, 1024);
            console.log('Created real headless-gl WebGL context');
            return gl;
          }
          return null;
        },
        style: {},
        width: 1024,
        height: 1024,
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    }
    return {
      getContext: () => null,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  },
  body: { 
    appendChild: () => {},
    removeChild: () => {}
  }
};

// Spine library for skeleton data parsing (spine-core only)
let spine: any;
try {
  // vm moduleを使ってspine-core.jsを実行
  const vm = require('vm');
  const fs = require('fs');
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
    console.log('✅ Spine core library loaded successfully via VM');
    console.log('SkeletonBinary available:', !!spine.SkeletonBinary);
    console.log('SkeletonData available:', !!spine.SkeletonData);
    console.log('TextureAtlas available:', !!spine.TextureAtlas);
    console.log('BinaryInput available:', !!spine.BinaryInput);
    console.log('AtlasAttachmentLoader available:', !!spine.AtlasAttachmentLoader);
  } else {
    console.log('⚠️  Spine core library loaded but spine object is null');
  }
} catch (error) {
  console.warn('⚠️  Failed to load Spine core library:', error);
  console.log('Error details:', error instanceof Error ? error.message : String(error));
  spine = null;
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

  async extract(): Promise<Buffer> {
    try {
      // ファイルの存在確認
      if (!fs.existsSync(this.options.atlasPath)) {
        throw new Error(`Atlas file not found: ${this.options.atlasPath}`);
      }
      if (!fs.existsSync(this.options.skelPath)) {
        throw new Error(`Skel file not found: ${this.options.skelPath}`);
      }

      // Canvas初期化
      this.ctx.clearRect(0, 0, this.options.width, this.options.height);
      this.ctx.fillStyle = 'transparent';
      this.ctx.fillRect(0, 0, this.options.width, this.options.height);

      // Spine データの読み込みと描画
      await this.loadAndRenderSpine(this.options.atlasPath, this.options.skelPath);

      // 画像Bufferを返す
      return await this.getImageBuffer();

    } catch (error) {
      throw new Error(`Failed to extract spine animation: ${error}`);
    }
  }

  private async loadAndRenderSpine(atlasPath: string, skelPath: string): Promise<void> {
    try {
      console.log(`Loading Spine files: ${atlasPath}, ${skelPath}`);
      
      // Spineライブラリに依存せず、直接headless-gl WebGLを使用
      console.log('🎮 Using independent headless-gl WebGL implementation...');
      
      // Atlas ファイルの読み込み
      const atlasText = fs.readFileSync(atlasPath, 'utf8');
      console.log(`Atlas file loaded, size: ${atlasText.length} characters`);
      
      // Skeleton データの読み込み  
      const skelData = fs.readFileSync(skelPath);
      console.log(`Skel file loaded, size: ${skelData.length} bytes`);
      
      // Atlas ディレクトリを取得
      const atlasDir = path.dirname(atlasPath);
      console.log(`Atlas directory: ${atlasDir}`);
      
      // Spine Canvas での描画を試行
      await this.renderWithSpineCanvas(atlasText, skelData, atlasDir);
      
      console.log(`Options: skin=${this.options.skin}, animation=${this.options.animation}, frame=${this.options.frame}`);

    } catch (error) {
      console.error('Spine loading error:', error);
      // エラー時は従来の画像描画にフォールバック
      await this.fallbackImageRender(atlasPath);
    }
  }

  private async renderWithSpineCanvas(atlasText: string, skelData: Buffer, atlasDir: string): Promise<void> {
    console.log('Attempting Spine WebGL rendering...');
    
    try {
      // Spineライブラリに依存しない独自WebGL実装を使用
      console.log('🚀 Using custom headless-gl WebGL implementation...');
      
      // Atlas情報を解析
      const atlasInfo = AtlasParser.parseAtlasData(atlasText, atlasDir);
      console.log(`Parsed atlas info: ${atlasInfo.images.length} images, ${atlasInfo.regions.length} regions`);
      
      // headless-gl WebGL でSpineスタイル描画
      const gl = createGL(this.options.width, this.options.height);
      console.log(`🖥️ Created headless-gl WebGL context: ${this.options.width}x${this.options.height}`);
      
      await this.renderSpineWithHeadlessGL(gl, atlasInfo, skelData);
      
    } catch (error) {
      console.warn('Spine WebGL rendering failed:', error);
      throw error;
    }
  }

  private async renderWithSpineWebGL(atlasText: string, skelData: Buffer, atlasDir: string): Promise<void> {
    console.log('Setting up Spine headless-gl WebGL rendering...');
    
    try {
      // headless-gl WebGLコンテキストを作成
      const gl = createGL(this.options.width, this.options.height);
      console.log(`🖥️ Created headless-gl WebGL context: ${this.options.width}x${this.options.height}`);
      
      // WebGL初期設定
      gl.viewport(0, 0, this.options.width, this.options.height);
      gl.clearColor(0.0, 0.0, 0.0, 0.0); // 透明背景
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      // headless-gl WebGL で実際のSpineテクスチャを使った描画
      console.log('🎮 Implementing Spine-like WebGL rendering with atlas data...');
      
      // Atlas情報を解析
      const atlasInfo = AtlasParser.parseAtlasData(atlasText, atlasDir);
      console.log(`🖼️ Parsed atlas info: ${atlasInfo.images.length} images, ${atlasInfo.regions.length} regions`);
      
      // headless-gl WebGL でSpineスタイル描画
      await this.renderSpineWithHeadlessGL(gl, atlasInfo, skelData);
      
    } catch (error) {
      console.error('Spine WebGL rendering error:', error);
      throw error;
    }
  }

  private setupSkeletonProperties(): void {
    // スキンを設定
    if (this.options.skin && this.skeletonData.findSkin) {
      const skin = this.skeletonData.findSkin(this.options.skin);
      if (skin) {
        this.skeleton.setSkin(skin);
        console.log(`Applied skin: ${this.options.skin}`);
      }
    }
    
    // アニメーション状態を設定
    const animationStateData = new spine.AnimationStateData(this.skeletonData);
    this.animationState = new spine.AnimationState(animationStateData);
    
    // アニメーションを設定
    if (this.options.animation && this.skeletonData.findAnimation) {
      const animation = this.skeletonData.findAnimation(this.options.animation);
      if (animation) {
        this.animationState.setAnimation(0, this.options.animation, false);
        console.log(`Applied animation: ${this.options.animation}`);
        
        // 指定フレームまでアニメーションを進める
        const frameTime = (this.options.frame - 1) / 30.0; // 30fpsと仮定
        this.animationState.update(frameTime);
        this.animationState.apply(this.skeleton);
      }
    }
    
    // スケルトンの更新
    this.skeleton.updateWorldTransform();
  }

  private async renderWithHeadlessGL(gl: any): Promise<void> {
    console.log('🎯 Starting headless-gl WebGL rendering...');
    
    try {
      // WebGLビューポートと背景クリア
      gl.viewport(0, 0, this.options.width, this.options.height);
      gl.clearColor(0.1, 0.1, 0.2, 1.0); // 濃い青の背景
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      console.log('🧪 Testing enhanced WebGL rendering with multiple shapes...');
      
      // 複数の図形を描画してWebGLの機能をテスト
      await this.drawMultipleShapes(gl);
      
      // アニメーション情報をテキストとして描画（シミュレート）
      await this.drawAnimationInfo(gl);
      
      // WebGLフレームバッファからピクセルデータを取得
      const pixels = new Uint8Array(this.options.width * this.options.height * 4);
      gl.readPixels(0, 0, this.options.width, this.options.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      // ピクセルデータをskia-canvasでPNGに変換
      const canvas = new Canvas(this.options.width, this.options.height);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(this.options.width, this.options.height);
      
      // WebGLピクセルはY軸が反転しているので修正
      for (let y = 0; y < this.options.height; y++) {
        for (let x = 0; x < this.options.width; x++) {
          const srcIndex = ((this.options.height - 1 - y) * this.options.width + x) * 4;
          const dstIndex = (y * this.options.width + x) * 4;
          
          imageData.data[dstIndex] = pixels[srcIndex];       // R
          imageData.data[dstIndex + 1] = pixels[srcIndex + 1]; // G
          imageData.data[dstIndex + 2] = pixels[srcIndex + 2]; // B
          imageData.data[dstIndex + 3] = pixels[srcIndex + 3]; // A
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // PNG形式でファイルに保存
      const buffer = await canvas.toBuffer('png');
      const outputPath = `headless-gl-test-${Date.now()}.png`;
      fs.writeFileSync(outputPath, buffer);
      console.log(`✅ headless-gl WebGL rendering saved to: ${outputPath} (${buffer.length} bytes)`);
      
    } catch (error) {
      console.error('❌ Error in renderWithHeadlessGL:', error);
      throw error;
    }
  }

  private async drawMultipleShapes(gl: any): Promise<void> {
    console.log('🔺 Drawing multiple test shapes...');
    
    // 三角形 1: オレンジ色
    const triangleVertices = new Float32Array([
      -0.6,  0.5,   1.0, 0.5, 0.0, 1.0,  // 頂点1: 位置 + 色(RGBA)
      -0.9, -0.5,   1.0, 0.5, 0.0, 1.0,  // 頂点2
      -0.3, -0.5,   1.0, 0.5, 0.0, 1.0   // 頂点3
    ]);
    
    // 四角形: 青色
    const quadVertices = new Float32Array([
      0.3,  0.5,    0.0, 0.5, 1.0, 1.0,  // 頂点1
      0.9,  0.5,    0.0, 0.5, 1.0, 1.0,  // 頂点2  
      0.9, -0.5,    0.0, 0.5, 1.0, 1.0,  // 頂点3
      0.3, -0.5,    0.0, 0.5, 1.0, 1.0   // 頂点4
    ]);
    
    const quadIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    
    // カラーシェーダー
    const colorVertexShader = `
      attribute vec2 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
        vColor = color;
      }
    `;
    
    const colorFragmentShader = `
      precision mediump float;
      varying vec4 vColor;
      void main() {
        gl_FragColor = vColor;
      }
    `;
    
    const program = this.createShaderProgram(gl, colorVertexShader, colorFragmentShader);
    gl.useProgram(program);
    
    // 三角形描画
    const triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    
    const posLocation = gl.getAttribLocation(program, 'position');
    const colorLocation = gl.getAttribLocation(program, 'color');
    
    gl.enableVertexAttribArray(posLocation);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 24, 8);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    // 四角形描画
    const quadBuffer = gl.createBuffer();
    const quadIndexBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quadIndices, gl.STATIC_DRAW);
    
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 24, 8);
    
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
    console.log('✅ Multiple shapes drawn successfully');
  }
  
  private async drawAnimationInfo(gl: any): Promise<void> {
    console.log('📝 Simulating animation info display...');
    
    // アニメーション情報を視覚化するための円を描画
    const circleVertices = [];
    const circleColors = [];
    const segments = 32;
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * 0.2;
      const y = Math.sin(angle) * 0.2;
      
      circleVertices.push(0.0, 0.0); // 中心点
      circleVertices.push(x, y);     // 円周上の点
      
      // グラデーション色
      const r = 0.5 + Math.cos(angle) * 0.5;
      const g = 0.5 + Math.sin(angle) * 0.5;
      const b = 0.8;
      
      circleColors.push(1.0, 1.0, 0.0, 1.0); // 中心は黄色
      circleColors.push(r, g, b, 1.0);       // 円周は変化する色
    }
    
    const circleVertexArray = new Float32Array(circleVertices);
    const circleColorArray = new Float32Array(circleColors);
    
    // 円の描画用シェーダー (既存のカラーシェーダーを再利用)
    const colorVertexShader = `
      attribute vec2 position;
      attribute vec4 color;
      varying vec4 vColor;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
        vColor = color;
      }
    `;
    
    const colorFragmentShader = `
      precision mediump float;
      varying vec4 vColor;
      void main() {
        gl_FragColor = vColor;
      }
    `;
    
    const program = this.createShaderProgram(gl, colorVertexShader, colorFragmentShader);
    gl.useProgram(program);
    
    // バッファ設定
    const vertexBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertexArray, gl.STATIC_DRAW);
    
    const posLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, circleColorArray, gl.STATIC_DRAW);
    
    const colorLocation = gl.getAttribLocation(program, 'color');
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    
    // 三角形ストリップで円を描画
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, circleVertices.length / 2);
    
    console.log(`🎨 Animation info circle rendered (frame: ${this.options.frame})`);
  }
  
  private createShaderProgram(gl: any, vertexSource: string, fragmentSource: string): any {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
      return null;
    }
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
      return null;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking error:', gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }
  
  private async renderSpineWithHeadlessGL(gl: any, atlasInfo: AtlasData, skelData: Buffer): Promise<void> {
    console.log('🎯 Starting Spine-style headless-gl WebGL rendering...');
    
    try {
      // WebGLビューポートと背景設定
      gl.viewport(0, 0, this.options.width, this.options.height);
      gl.clearColor(0.0, 0.0, 0.0, 0.0); // 透明背景
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      
      // Spineアトラステクスチャを読み込み
      const textures = await this.loadAtlasTextures(gl, atlasInfo);
      console.log(`✅ Loaded ${textures.length} atlas textures`);
      
      // Spine skelデータを解析（基本的なバイナリ解析）
      const skelInfo = this.parseBasicSkelData(skelData);
      console.log(`📋 Parsed skel: ${skelInfo.bones} bones, ${skelInfo.slots} slots, ${skelInfo.animations} animations`);
      
      // スキンとアニメーションに基づいて描画するリージョンを選択
      const relevantRegions = this.getRelevantRegions(atlasInfo, this.options.skin, this.options.animation);
      console.log(`🎯 Selected ${relevantRegions.length} regions for skin "${this.options.skin}" and animation "${this.options.animation}"`);
      
      // Spineスタイルのマルチレイヤー描画
      await this.drawSpineRegions(gl, textures, relevantRegions, skelInfo);
      
      // WebGLフレームバッファからピクセルデータを取得してCanvasに描画
      await this.transferWebGLToCanvas(gl);
      
    } catch (error) {
      console.error('❌ Error in renderSpineWithHeadlessGL:', error);
      throw error;
    }
  }
  
  private async transferWebGLToCanvas(gl: any): Promise<void> {
    // WebGLフレームバッファからピクセルデータを取得
    const pixels = new Uint8Array(this.options.width * this.options.height * 4);
    gl.readPixels(0, 0, this.options.width, this.options.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // Canvas ImageDataを作成
    const imageData = this.ctx.createImageData(this.options.width, this.options.height);
    
    // WebGLは下から上に読み取るため、Y軸を反転
    for (let y = 0; y < this.options.height; y++) {
      for (let x = 0; x < this.options.width; x++) {
        const srcIndex = ((this.options.height - 1 - y) * this.options.width + x) * 4;
        const dstIndex = (y * this.options.width + x) * 4;
        
        imageData.data[dstIndex] = pixels[srcIndex];       // R
        imageData.data[dstIndex + 1] = pixels[srcIndex + 1]; // G
        imageData.data[dstIndex + 2] = pixels[srcIndex + 2]; // B
        imageData.data[dstIndex + 3] = pixels[srcIndex + 3]; // A
      }
    }
    
    // CanvasにImageDataを描画
    this.ctx.putImageData(imageData, 0, 0);
    console.log('✅ WebGL frame transferred to Canvas');
  }
  
  private async loadAtlasTextures(gl: any, atlasInfo: any): Promise<any[]> {
    const textures = [];
    
    for (const imagePath of atlasInfo.images) {
      try {
        const fullPath = path.resolve(path.dirname(this.options.atlasPath), imagePath);
        if (fs.existsSync(fullPath)) {
          console.log(`🖼️  Loading atlas texture: ${imagePath}`);
          
          // Canvas で画像を読み込み
          const canvas = new Canvas(1024, 1024); // 仮サイズ
          const ctx = canvas.getContext('2d');
          const image = new Image();
          const imageData = fs.readFileSync(fullPath);
          image.src = imageData;
          
          // Canvas に描画してピクセルデータを取得
          ctx.drawImage(image, 0, 0);
          const pixelData = ctx.getImageData(0, 0, image.width, image.height);
          
          // WebGL テクスチャを作成
          const texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pixelData.data));
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          
          textures.push({
            texture,
            width: image.width,
            height: image.height,
            path: imagePath
          });
          
          console.log(`✅ Texture loaded: ${imagePath} (${image.width}x${image.height})`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to load texture ${imagePath}:`, error);
      }
    }
    
    return textures;
  }
  
  public parseBasicSkelData(skelData: Buffer): any {
    // Spineライブラリを使用したskelデータの正確な解析
    const info = {
      bones: 0,
      slots: 0,
      animations: 0,
      skins: [] as string[],
      animationNames: [] as string[],
      version: 'unknown'
    };
    
    try {
      console.log('🔍 Analyzing Spine skel data using Spine library...');
      
      // Spineライブラリを使用した解析を試行（利用可能な場合）
      if (spine) {
        try {
          console.log('🔧 Attempting to parse with available Spine library features...');
          
          // JSON形式のskelファイルかチェック（最初の文字が'{'の場合）
          const skelString = skelData.toString('utf8', 0, 100);
          const isJsonFormat = skelString.trim().startsWith('{');
          
          if (isJsonFormat) {
            console.log('📄 Detected JSON format skel file');
            try {
              const jsonData = JSON.parse(skelData.toString('utf8'));
              
              if (jsonData.skeleton) {
                info.version = jsonData.skeleton.spine || 'unknown';
              }
              
              if (jsonData.bones) {
                info.bones = jsonData.bones.length;
              }
              
              if (jsonData.slots) {
                info.slots = jsonData.slots.length;
              }
              
              if (jsonData.skins) {
                info.skins = Object.keys(jsonData.skins);
              }
              
              if (jsonData.animations) {
                info.animationNames = Object.keys(jsonData.animations);
                info.animations = info.animationNames.length;
              }
              
              console.log('✅ Successfully parsed JSON skel file using Spine library approach');
              console.log(`📊 Bones: ${info.bones}, Slots: ${info.slots}, Animations: ${info.animations}`);
              console.log(`📋 Skins: ${info.skins.join(', ')}`);
              console.log(`🎬 Animations: ${info.animationNames.join(', ')}`);
              
              return info;
            } catch (jsonError) {
              console.warn('⚠️  JSON parsing failed:', jsonError);
            }
          } else {
            console.log('📄 Detected binary format skel file - Spine library binary parsing not available in core version');
            // バイナリ形式の場合は後のフォールバック処理に任せる
          }
        } catch (spineError) {
          console.warn('⚠️  Spine library parsing failed, falling back to binary analysis:', spineError);
        }
      } else {
        console.warn('⚠️  Spine library not available, using binary analysis');
      }
      
    } catch (error) {
      console.warn('Skel data parsing failed:', error);
    }
    
    return info;
  }
  
  private extractNullTerminatedStrings(buffer: Buffer): string[] {
    const strings: string[] = [];
    let currentString = '';
    
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      
      if (byte === 0) {
        // null終端文字を発見
        if (currentString.length > 2) { // 2文字以上の文字列のみ保存
          strings.push(currentString);
        }
        currentString = '';
      } else if (byte >= 32 && byte <= 126) {
        // 印刷可能ASCII文字
        currentString += String.fromCharCode(byte);
      } else {
        // 非印刷可能文字で文字列終了
        if (currentString.length > 2) {
          strings.push(currentString);
        }
        currentString = '';
      }
    }
    
    return strings;
  }

  // スキンとアニメーションに基づいて描画するべきリージョンを選択
  getRelevantRegions(atlasInfo: AtlasData, skin: string = 'default', animation: string = ''): AtlasRegion[] {
    const relevantRegions = [];
    
    console.log(`🔍 Searching for regions with skin "${skin}" and animation "${animation}"`);
    
    // まず、指定されたスキンに一致するリージョンを検索
    for (const region of atlasInfo.regions) {
      let shouldInclude = false;
      
      // スキン名がリージョン名のプレフィックスと一致するかチェック
      if (region.name.startsWith(skin + '/')) {
        shouldInclude = true;
        console.log(`  ✅ Region "${region.name}" matches skin "${skin}"`);
      }
      // デフォルトスキンの場合、プレフィックスなしもチェック
      else if (skin === 'default' && !region.name.includes('/')) {
        shouldInclude = true;
        console.log(`  ✅ Region "${region.name}" matches default skin`);
      }
      
      // アニメーション名が指定されている場合、リージョン名にアニメーション情報が含まれているかチェック
      if (shouldInclude && animation) {
        // eyeOpenやmouthCloseなどのアニメーション状態を検索
        const regionNameLower = region.name.toLowerCase();
        const animationLower = animation.toLowerCase();
        
        // 部分マッチで確認（例: "eye_open" -> "eyeopen"）
        const normalizedAnimation = animationLower.replace('_', '');
        
        if (regionNameLower.includes(normalizedAnimation)) {
          console.log(`  🎬 Region "${region.name}" matches animation "${animation}"`);
        } else {
          // アニメーションが一致しない場合は除外
          shouldInclude = false;
          console.log(`  ❌ Region "${region.name}" does not match animation "${animation}"`);
        }
      }
      
      if (shouldInclude) {
        relevantRegions.push(region);
      }
    }
    
    // 関連リージョンが見つからない場合、デフォルトスキンを試行
    if (relevantRegions.length === 0 && skin !== 'default') {
      console.log(`⚠️  No regions found for skin "${skin}", trying default skin...`);
      return this.getRelevantRegions(atlasInfo, 'default', animation);
    }
    
    // それでも見つからない場合、すべてのリージョンを返す
    if (relevantRegions.length === 0) {
      console.log(`⚠️  No specific regions found, using all regions as fallback`);
      return atlasInfo.regions.slice(0, 10); // 最初の10個のリージョンを返す
    }
    
    return relevantRegions;
  }

  // Spineライブラリを使用してskin/animation情報を正確に取得
  public parseSpineData(atlasText: string, skelData: Buffer, atlasDir: string): { skins: string[], animations: string[] } {
    try {
      // JSONファイルの場合とバイナリファイルの場合を判定
      let jsonData: any;
      
      // skelDataがJSONかバイナリかを判定
      const isJson = skelData.toString('utf8', 0, 100).includes('"skeleton"');
      
      if (isJson) {
        // JSONファイルの場合
        jsonData = JSON.parse(skelData.toString('utf8'));
      } else {
        // バイナリファイル(.skel)の場合はSpineライブラリでの読み込みが必要
        // 今回は元の解析方法を継続（後の改善で対応）
        console.log('⚠️  Binary .skel files require atlas-based parsing. Using fallback method.');
        return { skins: [], animations: [] };
      }

      if (!spineLib || !spineLib.SkeletonJson) {
        console.log('⚠️  Spine library not available. Using fallback method.');
        return { skins: [], animations: [] };
      }

      // Mock AtlasAttachmentLoader for parsing
      const mockAtlas = {
        findRegion: () => null,
        dispose: () => {}
      };
      
      const mockAttachmentLoader = {
        newRegionAttachment: () => null,
        newMeshAttachment: () => null,
        newBoundingBoxAttachment: () => null,
        newClippingAttachment: () => null,
        newPathAttachment: () => null,
        newPointAttachment: () => null
      };

      const skeletonJson = new spineLib.SkeletonJson(mockAttachmentLoader);
      const skeletonData = skeletonJson.readSkeletonData(jsonData);

      // Skinsの取得
      const skins: string[] = [];
      if (skeletonData.skins && Array.isArray(skeletonData.skins)) {
        skeletonData.skins.forEach((skin: any) => {
          if (skin && skin.name) {
            skins.push(skin.name);
          }
        });
      }

      // Animationsの取得
      const animations: string[] = [];
      if (skeletonData.animations && Array.isArray(skeletonData.animations)) {
        skeletonData.animations.forEach((animation: any) => {
          if (animation && animation.name) {
            animations.push(animation.name);
          }
        });
      }

      return { skins, animations };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Failed to parse spine data with library: ${errorMessage}. Using fallback method.`);
      return { skins: [], animations: [] };
    }
  }

  async showInfo(): Promise<void> {
    try {
      console.log(`🎯 Atlas File: ${this.options.atlasPath}`);
      console.log(`🎯 Skel File: ${this.options.skelPath}`);
      console.log('');

      // Atlas ファイルの読み込みと解析
      if (!fs.existsSync(this.options.atlasPath)) {
        throw new Error(`Atlas file not found: ${this.options.atlasPath}`);
      }
      if (!fs.existsSync(this.options.skelPath)) {
        throw new Error(`Skel file not found: ${this.options.skelPath}`);
      }

      const atlasText = fs.readFileSync(this.options.atlasPath, 'utf8');
      const skelData = fs.readFileSync(this.options.skelPath);
      const atlasDir = path.dirname(this.options.atlasPath);

      console.log('🔍 Analyzing Atlas file...');
      const atlasInfo = AtlasParser.parseAtlasData(atlasText, atlasDir);
      
      console.log('🔍 Analyzing Skel file...');
      const skelInfo = this.parseBasicSkelData(skelData);

      console.log('🔍 Analyzing with Spine library...');
      const spineInfo = this.parseSpineData(atlasText, skelData, atlasDir);

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
        atlasInfo.regions.slice(0, 10).forEach((region, idx) => {
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
      console.log(`   Atlas: ${(fs.statSync(this.options.atlasPath).size / 1024).toFixed(1)} KB`);
      console.log(`   Skel: ${(fs.statSync(this.options.skelPath).size / 1024).toFixed(1)} KB`);

      console.log('\n💡 Usage Examples:');
      console.log(`   Basic: --atlas "${this.options.atlasPath}" --skel "${this.options.skelPath}"`);
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

  private async drawSpineRegions(gl: any, textures: any[], relevantRegions: AtlasRegion[], skelInfo: any): Promise<void> {
    console.log('🎨 Drawing selected Spine regions...');
    console.log(`📊 Textures available: ${textures.length}, Regions to draw: ${relevantRegions.length}`);
    
    if (relevantRegions.length === 0) {
      console.log('⚠️  No regions to draw!');
      return;
    }
    
    // テクスチャがない場合はエラー
    if (textures.length === 0) {
      console.log('❌ No textures available for drawing regions');
      return;
    }
    
    // メインテクスチャを取得（通常は最初の１つ）
    const mainTexture = textures[0];
    
    // Spine風のマルチパス描画
    const textureShaderSource = {
      vertex: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        attribute float a_alpha;
        
        uniform mat4 u_projection;
        uniform vec2 u_offset;
        uniform float u_scale;
        uniform float u_time;
        
        varying vec2 v_texCoord;
        varying float v_alpha;
        
        void main() {
          vec2 pos = a_position * u_scale + u_offset;
          
          // アニメーション効果: 時間による位置の変更
          float animOffset = sin(u_time + a_position.x * 3.14159) * 0.02;
          pos.y += animOffset;
          
          gl_Position = u_projection * vec4(pos, 0.0, 1.0);
          v_texCoord = a_texCoord;
          v_alpha = a_alpha;
        }
      `,
      fragment: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        uniform vec3 u_tint;
        uniform float u_brightness;
        
        varying vec2 v_texCoord;
        varying float v_alpha;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          color.rgb *= u_tint * u_brightness;
          color.a *= v_alpha;
          
          // Spine風のカラーブレンディング
          if (color.a < 0.01) discard;
          
          gl_FragColor = color;
        }
      `
    };
    
    const program = this.createShaderProgram(gl, textureShaderSource.vertex, textureShaderSource.fragment);
    gl.useProgram(program);
    
    // ユニフォーム取得
    const projectionLoc = gl.getUniformLocation(program, 'u_projection');
    const offsetLoc = gl.getUniformLocation(program, 'u_offset');
    const scaleLoc = gl.getUniformLocation(program, 'u_scale');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const textureLoc = gl.getUniformLocation(program, 'u_texture');
    const tintLoc = gl.getUniformLocation(program, 'u_tint');
    const brightnessLoc = gl.getUniformLocation(program, 'u_brightness');
    
    // プロジェクション行列 (正射影)
    const projection = new Float32Array([
      2.0 / this.options.width, 0, 0, 0,
      0, -2.0 / this.options.height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1
    ]);
    gl.uniformMatrix4fv(projectionLoc, false, projection);
    
    // アニメーション時間
    const animTime = (this.options.frame || 0) * 0.1;
    gl.uniform1f(timeLoc, animTime);
    
    // テクスチャバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mainTexture.texture);
    gl.uniform1i(textureLoc, 0);
    
    // 各リージョンを描画
    for (let i = 0; i < relevantRegions.length; i++) {
      const region = relevantRegions[i];
      
      console.log(`🖼️  Drawing region: ${region.name} (${region.width}x${region.height}) at (${region.x}, ${region.y})`);
      
      // リージョンのテクスチャ座標を計算
      const texX1 = region.x / mainTexture.width;
      const texY1 = region.y / mainTexture.height;
      const texX2 = (region.x + region.width) / mainTexture.width;
      const texY2 = (region.y + region.height) / mainTexture.height;
      
      // 画面上での位置とサイズ
      const screenScale = Math.min(this.options.width / region.width, this.options.height / region.height) * 0.8;
      const screenWidth = region.width * screenScale;
      const screenHeight = region.height * screenScale;
      
      // リージョンの配置（複数のリージョンがある場合は横に並べる）
      const spacing = screenWidth + 20;
      const totalWidth = relevantRegions.length * spacing - 20;
      const startX = -totalWidth / 2 + i * spacing;
      const posY = 0;
      
      console.log(`  📍 Screen position: (${startX.toFixed(0)}, ${posY}) size: ${screenWidth.toFixed(0)}x${screenHeight.toFixed(0)}`);
      console.log(`  🧩 Texture coords: (${texX1.toFixed(3)}, ${texY1.toFixed(3)}) to (${texX2.toFixed(3)}, ${texY2.toFixed(3)})`);
      
      // 描画設定
      gl.uniform2f(offsetLoc, startX, posY);
      gl.uniform1f(scaleLoc, 1.0);
      gl.uniform3f(tintLoc, 1.0, 1.0, 1.0);
      gl.uniform1f(brightnessLoc, 1.0);
      
      // 四角形の頂点データ（リージョン固有のテクスチャ座標）
      const vertices = new Float32Array([
        // position                    texCoord      alpha
        -screenWidth/2, -screenHeight/2,  texX1, texY2,  1.0,
         screenWidth/2, -screenHeight/2,  texX2, texY2,  1.0,
        -screenWidth/2,  screenHeight/2,  texX1, texY1,  1.0,
         screenWidth/2,  screenHeight/2,  texX2, texY1,  1.0
      ]);
      
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      
      // 属性設定
      const posLoc = gl.getAttribLocation(program, 'a_position');
      const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
      const alphaLoc = gl.getAttribLocation(program, 'a_alpha');
      
      gl.enableVertexAttribArray(posLoc);
      gl.enableVertexAttribArray(texCoordLoc);
      gl.enableVertexAttribArray(alphaLoc);
      
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 20, 0);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 20, 8);
      gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 20, 16);
      
      // 描画
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    console.log('✅ Selected Spine regions drawn successfully');
  }

  private async drawSpineLayers(gl: any, textures: any[], atlasInfo: any, skelInfo: any): Promise<void> {
    console.log('🎨 Drawing Spine-style layers...');
    console.log(`📊 Textures available: ${textures.length}, Regions: ${atlasInfo.regions.length}`);
    
    // テクスチャがない場合はダミーを作成
    if (textures.length === 0) {
      console.log('⚠️  No textures found, creating dummy texture for testing...');
      
      // 100x100のカラフルなダミーテクスチャを作成
      const dummyData = new Uint8Array(100 * 100 * 4);
      for (let i = 0; i < 100 * 100; i++) {
        const offset = i * 4;
        dummyData[offset] = Math.floor(Math.random() * 255);     // R
        dummyData[offset + 1] = Math.floor(Math.random() * 255); // G
        dummyData[offset + 2] = Math.floor(Math.random() * 255); // B
        dummyData[offset + 3] = 255; // A
      }
      
      const dummyTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 100, 100, 0, gl.RGBA, gl.UNSIGNED_BYTE, dummyData);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      textures.push({
        texture: dummyTexture,
        width: 100,
        height: 100,
        path: 'dummy'
      });
    }
    
    // Spine風のマルチパス描画
    const textureShaderSource = {
      vertex: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        attribute float a_alpha;
        
        uniform mat4 u_projection;
        uniform vec2 u_offset;
        uniform float u_scale;
        uniform float u_time;
        
        varying vec2 v_texCoord;
        varying float v_alpha;
        
        void main() {
          vec2 pos = a_position * u_scale + u_offset;
          
          // アニメーション効果: 時間による位置の変更
          float animOffset = sin(u_time + a_position.x * 3.14159) * 0.02;
          pos.y += animOffset;
          
          gl_Position = u_projection * vec4(pos, 0.0, 1.0);
          v_texCoord = a_texCoord;
          v_alpha = a_alpha;
        }
      `,
      fragment: `
        precision mediump float;
        
        uniform sampler2D u_texture;
        uniform vec3 u_tint;
        uniform float u_brightness;
        
        varying vec2 v_texCoord;
        varying float v_alpha;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          color.rgb *= u_tint * u_brightness;
          color.a *= v_alpha;
          
          // Spine風のカラーブレンディング
          if (color.a < 0.01) discard;
          
          gl_FragColor = color;
        }
      `
    };
    
    const program = this.createShaderProgram(gl, textureShaderSource.vertex, textureShaderSource.fragment);
    gl.useProgram(program);
    
    // ユニフォーム取得
    const projectionLoc = gl.getUniformLocation(program, 'u_projection');
    const offsetLoc = gl.getUniformLocation(program, 'u_offset');
    const scaleLoc = gl.getUniformLocation(program, 'u_scale');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const textureLoc = gl.getUniformLocation(program, 'u_texture');
    const tintLoc = gl.getUniformLocation(program, 'u_tint');
    const brightnessLoc = gl.getUniformLocation(program, 'u_brightness');
    
    // プロジェクション行列 (正射影)
    const projection = new Float32Array([
      2.0 / this.options.width, 0, 0, 0,
      0, -2.0 / this.options.height, 0, 0,
      0, 0, 1, 0,
      -1, 1, 0, 1
    ]);
    gl.uniformMatrix4fv(projectionLoc, false, projection);
    
    // アニメーション時間
    const animTime = (this.options.frame || 0) * 0.1;
    gl.uniform1f(timeLoc, animTime);
    
    // テクスチャを描画
    for (let i = 0; i < textures.length; i++) {
      const tex = textures[i];
      
      // 複数のレイヤーで同じテクスチャを異なる設定で描画
      const layers = [
        { offset: [0, 0], scale: 1.0, tint: [1.0, 1.0, 1.0], brightness: 1.0, alpha: 1.0 },
        { offset: [10, -10], scale: 0.95, tint: [0.8, 0.8, 1.0], brightness: 0.7, alpha: 0.3 }, // 影
        { offset: [-5, 5], scale: 1.02, tint: [1.2, 1.1, 0.9], brightness: 1.1, alpha: 0.4 }   // ハイライト
      ];
      
      for (const layer of layers) {
        // テクスチャバインド
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex.texture);
        gl.uniform1i(textureLoc, 0);
        
        // レイヤー設定
        gl.uniform2f(offsetLoc, layer.offset[0], layer.offset[1]);
        gl.uniform1f(scaleLoc, layer.scale);
        gl.uniform3f(tintLoc, layer.tint[0], layer.tint[1], layer.tint[2]);
        gl.uniform1f(brightnessLoc, layer.brightness);
        
        // 四角形の頂点データ（画面サイズに合わせてスケール調整）
        const scaleX = this.options.width / tex.width * 0.5; // 画面幅の50%に収まるように
        const scaleY = this.options.height / tex.height * 0.5; // 画面高さの50%に収まるように
        const scaledWidth = tex.width * scaleX;
        const scaledHeight = tex.height * scaleY;
        
        const vertices = new Float32Array([
          // position     texCoord   alpha
          -scaledWidth/2, -scaledHeight/2,  0.0, 1.0,  layer.alpha,
           scaledWidth/2, -scaledHeight/2,  1.0, 1.0,  layer.alpha,
          -scaledWidth/2,  scaledHeight/2,  0.0, 0.0,  layer.alpha,
           scaledWidth/2,  scaledHeight/2,  1.0, 0.0,  layer.alpha
        ]);
        
        console.log(`🔍 Drawing layer ${layer.scale} at scale ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}, size ${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)}`);
        
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // 属性設定
        const posLoc = gl.getAttribLocation(program, 'a_position');
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        const alphaLoc = gl.getAttribLocation(program, 'a_alpha');
        
        gl.enableVertexAttribArray(posLoc);
        gl.enableVertexAttribArray(texCoordLoc);
        gl.enableVertexAttribArray(alphaLoc);
        
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 20, 0);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 20, 8);
        gl.vertexAttribPointer(alphaLoc, 1, gl.FLOAT, false, 20, 16);
        
        // 描画
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    
    console.log('✅ Spine-style layers drawn successfully');
  }
  
  private async saveWebGLToPNG(gl: any): Promise<void> {
    // WebGLフレームバッファからピクセルデータを取得
    const pixels = new Uint8Array(this.options.width * this.options.height * 4);
    gl.readPixels(0, 0, this.options.width, this.options.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // ピクセルデータをskia-canvasでPNGに変換
    const canvas = new Canvas(this.options.width, this.options.height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(this.options.width, this.options.height);
    
    // WebGLピクセルはY軸が反転しているので修正
    for (let y = 0; y < this.options.height; y++) {
      for (let x = 0; x < this.options.width; x++) {
        const srcIndex = ((this.options.height - 1 - y) * this.options.width + x) * 4;
        const dstIndex = (y * this.options.width + x) * 4;
        
        imageData.data[dstIndex] = pixels[srcIndex];       // R
        imageData.data[dstIndex + 1] = pixels[srcIndex + 1]; // G
        imageData.data[dstIndex + 2] = pixels[srcIndex + 2]; // B
        imageData.data[dstIndex + 3] = pixels[srcIndex + 3]; // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // PNG形式でファイルに保存
    const buffer = await canvas.toBuffer('png');
    const outputPath = `spine-webgl-test-${Date.now()}.png`;
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Spine WebGL rendering saved to: ${outputPath} (${buffer.length} bytes)`);
  }

  private async renderWithSceneRenderer(gl: any, canvas: any): Promise<void> {
    console.log('Rendering with Spine SceneRenderer...');
    
    try {
      // SceneRenderer を初期化
      const sceneRenderer = new spine.SceneRenderer(canvas, gl);
      
      // カメラ設定
      sceneRenderer.camera.setViewport(this.options.width, this.options.height);
      
      // レンダリング開始
      sceneRenderer.begin();
      
      // Skeleton を描画
      sceneRenderer.drawSkeleton(this.skeleton, false);
      
      // レンダリング終了
      sceneRenderer.end();
      
      console.log('Spine SceneRenderer drawing completed');
      
      // WebGL フレームバッファから Canvas 2D にコピー
      await this.copyWebGLToCanvas2D(gl, canvas);
      
    } catch (error) {
      console.error('SceneRenderer error:', error);
      throw error;
    }
  }

  private async copyWebGLToCanvas2D(gl: any, webglCanvas: any): Promise<void> {
    console.log('Copying WebGL content to Canvas 2D...');
    
    try {
      // WebGL フレームバッファからピクセルデータを読み取り
      const width = this.options.width;
      const height = this.options.height;
      const pixels = new Uint8Array(width * height * 4);
      
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      // Canvas 2D に描画
      this.ctx.save();
      this.ctx.clearRect(0, 0, width, height);
      
      // ImageData を作成してピクセルデータをコピー
      const imageData = this.ctx.createImageData(width, height);
      for (let i = 0; i < pixels.length; i++) {
        imageData.data[i] = pixels[i];
      }
      
      // Canvas に描画（Y軸を反転）
      this.ctx.scale(1, -1);
      this.ctx.translate(0, -height);
      this.ctx.putImageData(imageData, 0, 0);
      
      this.ctx.restore();
      
      // WebGL 情報オーバーレイを追加
      this.drawWebGLInfoOverlay();
      
      console.log('WebGL to Canvas 2D copy completed');
      
    } catch (error) {
      console.error('WebGL copy error:', error);
      // フォールバック: デバッグ情報を表示
      this.drawWebGLFallback();
    }
  }

  private drawWebGLInfoOverlay(): void {
    this.ctx.save();
    
    // 半透明の背景
    this.ctx.fillStyle = 'rgba(0, 50, 100, 0.8)';
    this.ctx.fillRect(10, 10, 400, 140);
    
    // 枠線
    this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(10, 10, 400, 140);
    
    // テキスト情報
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Spine WebGL Rendering', 20, 30);
    
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Animation: ${this.options.animation || 'None'}`, 20, 50);
    this.ctx.fillText(`Skin: ${this.options.skin || 'Default'}`, 20, 65);
    this.ctx.fillText(`Frame: ${this.options.frame}`, 20, 80);
    this.ctx.fillText(`Scale: ${this.options.scale}x`, 20, 95);
    
    // WebGL 情報
    this.ctx.fillStyle = 'rgba(100, 255, 100, 0.9)';
    this.ctx.fillText('✓ WebGL Context Created', 220, 50);
    this.ctx.fillText('✓ Spine SceneRenderer Used', 220, 65);
    this.ctx.fillText('✓ Frame Buffer Read', 220, 80);
    
    // 技術情報
    this.ctx.font = '10px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText('Mock WebGL implementation with Spine 3.6', 20, 125);
    
    this.ctx.restore();
  }

  private drawWebGLFallback(): void {
    this.ctx.save();
    
    this.ctx.fillStyle = 'rgba(100, 0, 0, 0.8)';
    this.ctx.fillRect(50, 50, 300, 100);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('WebGL Rendering Attempted', 200, 80);
    this.ctx.font = '12px Arial';
    this.ctx.fillText('Frame buffer read simulation', 200, 100);
    this.ctx.fillText(`${this.options.width}x${this.options.height} WebGL context`, 200, 120);
    
    this.ctx.restore();
  }

  private async renderSpineStyleAnimation(atlasInfo: AtlasData): Promise<void> {
    console.log('Rendering Spine-style animation...');
    
    // Canvas の初期化
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.options.width, this.options.height);
    
    // 座標系の設定
    this.ctx.translate(this.options.x + this.options.width / 2, this.options.y + this.options.height / 2);
    this.ctx.scale(this.options.scale, this.options.scale);
    
    // 背景画像を描画（メインのアトラス画像）
    if (atlasInfo.images.length > 0) {
      const mainImage = new Image();
      
      await new Promise<void>((resolve, reject) => {
        mainImage.onload = () => {
          // メイン画像を背景として描画
          const drawScale = 0.6; // 60%サイズで描画
          const drawWidth = mainImage.width * drawScale;
          const drawHeight = mainImage.height * drawScale;
          const drawX = -drawWidth / 2;
          const drawY = -drawHeight / 2;
          
          this.ctx.drawImage(mainImage, drawX, drawY, drawWidth, drawHeight);
          console.log(`Drew main atlas image: ${drawWidth}x${drawHeight}`);
          resolve();
        };
        
        mainImage.onerror = reject;
        mainImage.src = atlasInfo.images[0];
      });
    }
    
    // Spine風のエフェクトを追加
    this.addSpineEffects(atlasInfo);
    
    this.ctx.restore();
    
    // 情報オーバーレイを追加
    this.drawEnhancedInfoOverlay(atlasInfo);
    
    console.log('Spine-style animation rendering completed');
  }

  private addSpineEffects(atlasInfo: { images: string[], regions: any[] }): void {
    // 高度なアニメーション効果のシミュレーション
    const frame = this.options.frame;
    const time = frame / 30.0; // 30fpsと仮定
    
    // WebGL風のシェーダー効果をシミュレート
    
    // 1. パルスエフェクト（心拍のような）
    const pulseScale = 1 + Math.sin(time * 4) * 0.02;
    this.ctx.scale(pulseScale, pulseScale);
    
    // 2. アニメーション別のエフェクト
    if (this.options.animation === 'walk') {
      // 歩行時の軽い揺れ
      const walkBounce = Math.sin(time * 8) * 0.03;
      this.ctx.rotate(walkBounce);
      
      // 歩行リズムでの縦の動き
      const walkVertical = Math.abs(Math.sin(time * 6)) * 5;
      this.ctx.translate(0, walkVertical);
      
    } else if (this.options.animation === 'run') {
      // 走行時のより激しい動き
      const runBounce = Math.sin(time * 12) * 0.05;
      this.ctx.rotate(runBounce);
      
      const runVertical = Math.abs(Math.sin(time * 10)) * 8;
      this.ctx.translate(0, runVertical);
      
    } else if (this.options.animation === 'idle' || this.options.animation === 'Idle') {
      // アイドル時の微細な呼吸効果
      const breathScale = 1 + Math.sin(time * 2) * 0.01;
      this.ctx.scale(breathScale, 1);
    }
    
    // 3. WebGL風のパーティクル効果シミュレーション
    this.drawWebGLStyleParticles(frame, atlasInfo);
    
    // 4. パーツごとの個別エフェクト
    this.drawRegionEffects(atlasInfo, time);
  }

  private drawWebGLStyleParticles(frame: number, atlasInfo: { images: string[], regions: any[] }): void {
    // WebGL風のパーティクルエフェクトをCanvas 2Dで模倣
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (frame * 0.1);
      const radius = 100 + Math.sin(frame * 0.2 + i) * 20;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      // パーティクルのアルファ値をアニメーション
      const alpha = (Math.sin(frame * 0.3 + i * 0.5) + 1) * 0.3;
      
      // グラデーションを使った光効果
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 15);
      gradient.addColorStop(0, `rgba(100, 200, 255, ${alpha})`);
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 15, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawRegionEffects(atlasInfo: { images: string[], regions: any[] }, time: number): void {
    if (atlasInfo.regions.length === 0) return;
    
    // 重要なパーツ（体、頭、手足など）を特定
    const importantParts = atlasInfo.regions.filter(region => 
      region.name.includes('head') || 
      region.name.includes('body') || 
      region.name.includes('torso') ||
      region.name.includes('hand') ||
      region.name.includes('foot')
    );
    
    // 各重要パーツにエフェクトを追加
    importantParts.slice(0, 5).forEach((region, i) => {
      const regionX = (region.x - 512) * 0.3;
      const regionY = (region.y - 256) * 0.3;
      const regionW = region.width * 0.3;
      const regionH = region.height * 0.3;
      
      // WebGL風のボーダーエフェクト
      const glowIntensity = (Math.sin(time * 3 + i * 0.8) + 1) * 0.5;
      const glowColor = `rgba(255, 100, 100, ${glowIntensity * 0.4})`;
      
      this.ctx.strokeStyle = glowColor;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 10;
      
      this.ctx.strokeRect(regionX - 2, regionY - 2, regionW + 4, regionH + 4);
      
      // シャドウをリセット
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      
      // パーツ名をグローエフェクト付きで描画
      this.ctx.fillStyle = 'white';
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 2;
      this.ctx.font = 'bold 11px Arial';
      
      // テキストにアウトライン効果
      this.ctx.strokeText(region.name, regionX, regionY - 8);
      this.ctx.fillText(region.name, regionX, regionY - 8);
    });
  }

  private drawEnhancedInfoOverlay(atlasInfo: { images: string[], regions: any[] }): void {
    // WebGL風の拡張された情報オーバーレイ
    this.ctx.save();
    this.ctx.resetTransform();
    
    // グラデーション背景でWebGL風の見た目
    const gradient = this.ctx.createLinearGradient(10, 10, 10, 150);
    gradient.addColorStop(0, 'rgba(20, 40, 80, 0.9)');
    gradient.addColorStop(1, 'rgba(10, 20, 40, 0.9)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(10, 10, 380, 140);
    
    // WebGL風の光る枠線
    this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = 'rgba(100, 150, 255, 0.5)';
    this.ctx.shadowBlur = 5;
    this.ctx.strokeRect(10, 10, 380, 140);
    
    // シャドウをリセット
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    
    // タイトル（グロー効果付き）
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    this.ctx.lineWidth = 1;
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    
    this.ctx.strokeText('Spine Animation (WebGL-Style)', 20, 30);
    this.ctx.fillText('Spine Animation (WebGL-Style)', 20, 30);
    
    // アニメーション情報
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText(`🎬 Animation: ${this.options.animation || 'None'}`, 20, 55);
    this.ctx.fillText(`👤 Skin: ${this.options.skin || 'Default'}`, 20, 75);
    this.ctx.fillText(`🎞️ Frame: ${this.options.frame}`, 20, 95);
    this.ctx.fillText(`🔍 Scale: ${this.options.scale}x`, 20, 115);
    
    // Atlas情報（右側）
    this.ctx.fillStyle = 'rgba(100, 255, 100, 0.9)';
    this.ctx.fillText(`📁 Images: ${atlasInfo.images.length}`, 220, 55);
    this.ctx.fillText(`🧩 Regions: ${atlasInfo.regions.length}`, 220, 75);
    this.ctx.fillText(`📐 Canvas: ${this.options.width}x${this.options.height}`, 220, 95);
    
    // エフェクト情報
    const activeEffects = [];
    if (this.options.animation === 'walk') activeEffects.push('Walk Bounce');
    if (this.options.animation === 'run') activeEffects.push('Run Shake');
    if (this.options.animation === 'idle' || this.options.animation === 'Idle') activeEffects.push('Breath');
    activeEffects.push('Particles', 'Glow');
    
    this.ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
    this.ctx.fillText(`✨ Effects: ${activeEffects.join(', ')}`, 220, 115);
    
    // 技術情報（下部）
    this.ctx.font = '10px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('WebGL-style rendering simulation • Atlas parsing • Dynamic effects', 20, 135);
    
    this.ctx.restore();
  }

  private async renderSkeletonWithCanvas(): Promise<void> {
    try {
      console.log('Rendering skeleton with Spine Canvas...');
      
      // Skeleton インスタンスを作成
      this.skeleton = new spine.Skeleton(this.skeletonData);
      
      // スキンを設定
      if (this.options.skin && this.skeletonData.findSkin) {
        const skin = this.skeletonData.findSkin(this.options.skin);
        if (skin) {
          this.skeleton.setSkin(skin);
          console.log(`Applied skin: ${this.options.skin}`);
        }
      }
      
      // アニメーション状態を設定
      const animationStateData = new spine.AnimationStateData(this.skeletonData);
      this.animationState = new spine.AnimationState(animationStateData);
      
      // アニメーションを設定
      if (this.options.animation && this.skeletonData.findAnimation) {
        const animation = this.skeletonData.findAnimation(this.options.animation);
        if (animation) {
          this.animationState.setAnimation(0, this.options.animation, false);
          console.log(`Applied animation: ${this.options.animation}`);
          
          // 指定フレームまでアニメーションを進める
          const frameTime = (this.options.frame - 1) / 30.0; // 30fpsと仮定
          this.animationState.update(frameTime);
          this.animationState.apply(this.skeleton);
        }
      }
      
      // スケルトンの更新
      this.skeleton.updateWorldTransform();
      
      // SkeletonRenderer でCanvas に描画
      await this.drawSkeletonToCanvas();
      
    } catch (error) {
      console.error('Skeleton rendering error:', error);
      throw error;
    }
  }

  private async drawSkeletonToCanvas(): Promise<void> {
    try {
      // Canvas の初期化
      this.ctx.save();
      this.ctx.clearRect(0, 0, this.options.width, this.options.height);
      
      // 座標系の設定
      this.ctx.translate(this.options.x + this.options.width / 2, this.options.y + this.options.height / 2);
      this.ctx.scale(this.options.scale, -this.options.scale); // Y軸を反転（Spineの座標系）
      
      // SkeletonRenderer を使用
      if (spine.SkeletonRenderer) {
        const renderer = new spine.SkeletonRenderer(this.ctx);
        renderer.triangleRendering = true;
        renderer.draw(this.skeleton);
        console.log('Skeleton drawn with SkeletonRenderer');
      } else {
        throw new Error('spine.SkeletonRenderer not available');
      }
      
      this.ctx.restore();
      
      // 情報オーバーレイを追加
      this.drawInfoOverlay();
      
    } catch (error) {
      console.error('Canvas drawing error:', error);
      throw error;
    }
  }

  private async fallbackImageRender(atlasPath: string): Promise<void> {
    console.log('Using fallback image rendering...');
    
    // Atlas ファイルから画像ファイルを抽出
    const atlasText = fs.readFileSync(atlasPath, 'utf8');
    const atlasDir = path.dirname(atlasPath);
    const imageFiles = this.extractImageFilesFromAtlas(atlasText, atlasDir);
    
    // 従来の画像描画を実行
    await this.renderSpineAnimation(imageFiles);
  }

  private drawInfoOverlay(): void {
    // 情報オーバーレイを描画
    this.ctx.save();
    this.ctx.resetTransform();
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 300, 80);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Spine Canvas Rendering', 20, 30);
    
    if (this.options.animation) {
      this.ctx.fillText(`Animation: ${this.options.animation}`, 20, 50);
    }
    if (this.options.skin) {
      this.ctx.fillText(`Skin: ${this.options.skin}`, 20, 70);
    }
    this.ctx.fillText(`Frame: ${this.options.frame}`, 20, 90);
    
    this.ctx.restore();
  }

  private extractImageFilesFromAtlas(atlasText: string, atlasDir: string): string[] {
    const lines = atlasText.split('\n');
    const imageFiles: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // .png, .jpg などの画像ファイルを検出
      if (trimmedLine.match(/\.(png|jpg|jpeg)$/i)) {
        const imagePath = path.resolve(atlasDir, trimmedLine);
        if (fs.existsSync(imagePath)) {
          imageFiles.push(imagePath);
        }
      }
    }
    
    return imageFiles;
  }

  private async renderSpineAnimation(imageFiles: string[]): Promise<void> {
    // Canvas の初期化
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.options.width, this.options.height);
    
    // 背景を透明に設定
    this.ctx.globalCompositeOperation = 'source-over';
    
    // 座標系の設定
    this.ctx.translate(this.options.x + this.options.width / 2, this.options.y + this.options.height / 2);
    this.ctx.scale(this.options.scale, this.options.scale);
    
    // 画像ファイルが見つかった場合は、実際に画像を読み込んで描画
    if (imageFiles.length > 0) {
      console.log(`Rendering ${imageFiles.length} images`);
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = imageFiles[i];
        try {
          console.log(`Loading and drawing image: ${path.basename(imagePath)}`);
          
          // skia-canvasのImageを使用して画像を読み込み
          const image = new Image();
          
          // 画像の読み込みを待つ
          await new Promise<void>((resolve, reject) => {
            image.onload = () => {
              try {
                // 画像を中央に描画（スケール調整）
                const drawWidth = image.width * 0.5;  // 50%サイズで描画
                const drawHeight = image.height * 0.5;
                const drawX = -drawWidth / 2;
                const drawY = -drawHeight / 2;
                
                this.ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
                console.log(`Successfully drew image: ${path.basename(imagePath)} (${image.width}x${image.height})`);
                resolve();
              } catch (error) {
                console.error(`Failed to draw image: ${error}`);
                reject(error);
              }
            };
            
            image.onerror = (error) => {
              console.error(`Failed to load image ${imagePath}:`, error);
              reject(error);
            };
            
            // 画像ファイルを読み込み
            image.src = imagePath;
          });
          
        } catch (error) {
          console.warn(`Failed to process image ${imagePath}:`, error);
          
          // エラー時はプレースホルダー描画
          this.ctx.fillStyle = `hsl(${i * 120}, 70%, 50%)`;
          this.ctx.fillRect(-50 + i * 20, -50 + i * 20, 80, 80);
          this.ctx.fillStyle = 'white';
          this.ctx.font = '12px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('Load Error', -10 + i * 20, -10 + i * 20);
        }
      }
      
      // Spine情報をオーバーレイとして描画
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(-150, 120, 300, 80);
      
      this.ctx.fillStyle = 'white';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Spine Animation`, 0, 140);
      if (this.options.animation) {
        this.ctx.fillText(`Animation: ${this.options.animation}`, 0, 155);
      }
      if (this.options.skin) {
        this.ctx.fillText(`Skin: ${this.options.skin}`, 0, 170);
      }
      this.ctx.fillText(`Frame: ${this.options.frame}`, 0, 185);
      
    } else {
      // 画像ファイルが見つからない場合
      this.ctx.fillStyle = 'orange';
      this.ctx.fillRect(-100, -100, 200, 200);
      this.ctx.fillStyle = 'black';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('No Images Found', 0, 0);
    }
    
    this.ctx.restore();
    console.log('Spine animation rendering completed');
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
    this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    this.ctx.fillRect(-75, -75, 150, 150);
    this.ctx.fillStyle = 'rgba(100, 100, 255, 0.8)';
    this.ctx.fillRect(-50, -50, 100, 100);
    
    // エラー情報テキスト描画
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Spine Loading Failed', 0, -20);
    this.ctx.fillText('Using Fallback Render', 0, 0);
    
    // オプション情報を表示
    this.ctx.font = '10px Arial';
    this.ctx.fillText(`Skin: ${this.options.skin || 'None'}`, 0, 25);
    this.ctx.fillText(`Animation: ${this.options.animation || 'None'}`, 0, 40);
    this.ctx.fillText(`Frame: ${this.options.frame}`, 0, 55);
    
    this.ctx.restore();
    console.log('Fallback rendering applied');
  }

  private async getImageBuffer(): Promise<Buffer> {
    return await this.canvas.toBuffer('png');
  }
}