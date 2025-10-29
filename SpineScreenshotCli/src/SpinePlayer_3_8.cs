using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Content;
using Microsoft.Xna.Framework.Graphics;
using Spine;

namespace SpineScreenshotCli;

public class SpinePlayer_3_8
{
    private Skeleton skeleton;
    private AnimationState state;
    private SkeletonRenderer skeletonRenderer;
    private ExposedList<Animation> listAnimation;
    private ExposedList<Skin> listSkin;
    private Atlas atlas;
    private SkeletonData skeletonData;
    private AnimationStateData stateData;
    private SkeletonBinary binary;
    private SkeletonJson json;
    private String[] _skins = Array.Empty<string>();
    private String[] _animations = Array.Empty<string>();

    public void Initialize()
    {
        SpinePlayer.Initialize(ref Global.GraphicsDevice, ref Global.SpriteBatch);
    }

    public void LoadContent(Options options) {
        skeletonRenderer = new SkeletonRenderer(Global.GraphicsDevice);
        skeletonRenderer.PremultipliedAlpha = Global.Info.UseAlpha;

        if (Global.multiTexture != null && Global.multiTexture.Length == 0) {
            atlas = new Atlas(options.AtlasPath, new XnaTextureLoader(Global.GraphicsDevice));
        } else {
            atlas = new Atlas(options.AtlasPath, new XnaTextureLoader(Global.GraphicsDevice, true, Global.multiTexture));
        }

        // Spineデータの読み込み
        if (Global.IsBinaryData(options.SkeletonPath)) {
            this.binary = new SkeletonBinary(this.atlas);
            this.binary.Scale = options.Scale;
            this.skeletonData = this.binary.ReadSkeletonData(options.SkeletonPath);
        } else {
            this.json = new SkeletonJson(this.atlas);
            this.json.Scale = options.Scale;
            this.skeletonData = this.json.ReadSkeletonData(options.SkeletonPath);
        }
        // global.SpineVersion = this.skeletonData.Version;

        // スケルトンの生成
        this.skeleton = new Skeleton(this.skeletonData);

        // Global.SetInitLocation(this.skeleton.Data.Height);
        // Global.FileHash = this.skeleton.Data.Hash;

        // アニメーションステートの生成
        this.stateData = new AnimationStateData(this.skeleton.Data);
        this.state = new AnimationState(this.stateData);

        // アニメーションリストの取得
        List<string> AnimationNames = new List<string>();
        this.listAnimation = this.state.Data.skeletonData.Animations;
        foreach( Animation An in listAnimation ) {
            AnimationNames.Add( An.Name );
        }
        Console.WriteLine($"Loaded {this.listAnimation.Count} animations.");

        // スキンリストの取得
        List<string> SkinNames = new List<string>();
        this.listSkin = state.Data.skeletonData.Skins;
        foreach( Skin sk in listSkin ) {
            SkinNames.Add( sk.Name );
        }   
        Console.WriteLine($"Loaded {this.listSkin.Count} skins.");

        // デフォルトアニメーションの設定
        var isLoop = false;
        Console.WriteLine($"Setting default animation: {this.listAnimation.Items[0]} (loop: {isLoop})");
        state.SetAnimation(0, this.listAnimation.Items[0], isLoop);

        // 初期位置の設定
        if (Global.isNew) {
            Global.Info.X = Global.Info.Width / 2;
            Global.Info.Y = Global.Info.Height / 2;
        }
        Global.isNew = false;
    }

    /// <summary>
    /// 更新処理
    /// </summary>
    /// <param name="gameTime"></param>
    public void Update(GameTime gameTime)
    {
        // 特になし
    }

    public void Render(Options options)
    {
        this._skins = ["default"];
        this._animations =
            Global.SpineInfo.animations.Items.Select(anime => anime.Name).ToArray()
            ?? Array.Empty<string>()
            ;

        foreach (var skinName in this._skins)
        {
            foreach (var animationName in this._animations)
            {
                if (string.IsNullOrEmpty(animationName))
                {
                    Console.WriteLine("No animation specified, skipping.");
                    continue;
                }

                Console.WriteLine($"Rendering: {skinName} {animationName}");
                // this._RenderAnimation(skinName, animationName);
                int frame = options.Frame;
                this.Draw(options, frame, skinName, animationName);
            }
        }
    }
    
    private void PreDraw( string animationName, RenderTarget2D renderTarget )
    {
        var graphicsDevice = Global.GraphicsDevice;
        int width = Global.Info.Width;
        int height = Global.Info.Height;
        int skeletonX = (int)skeleton.X;
        int skeletonY = (int)skeleton.Y;
        var backgroundColor = Global.Info.BackgroundColor;

        // 描画対象テクスチャをクリア
        graphicsDevice.SetRenderTarget(null);

        // GD設定をリセット
        graphicsDevice.BlendState = BlendState.AlphaBlend;
        graphicsDevice.RasterizerState = RasterizerState.CullNone;
        graphicsDevice.DepthStencilState = DepthStencilState.None;
        graphicsDevice.SamplerStates[0] = SamplerState.LinearWrap;

        // アニメーション状態をクリア
        state.ClearTracks();

        // 描画ターゲットの生成と背景描画
        graphicsDevice.SetRenderTarget(renderTarget);
        graphicsDevice.Clear(backgroundColor);

        // スキンとアニメーションの設定
        bool isLoop = false;
        // skeleton.SetSkin( skinName );                       // skin設定      
        // skeleton.SetslotsToSetupPose();                     // skin変更を反映
        state.SetAnimation(0, animationName, isLoop);       // animation設定
    }

    private void Draw(Options options, int frame, string skinName = "default", string animationName = "idle")
    {
        // Draw前処理
        var graphicsDevice = Global.GraphicsDevice;
        int width = Global.Info.Width;
        int height = Global.Info.Height;
        int skeletonX = (int)skeleton.X;
        int skeletonY = (int)skeleton.Y;
        const bool mipmap = false;
        using var renderTarget = new RenderTarget2D(
            graphicsDevice
            , width
            , height
            , mipmap
            , SurfaceFormat.Color
            , DepthFormat.None
        );
        this.PreDraw( animationName, renderTarget );
        var backgroundColor = Global.Info.BackgroundColor;

        // 別バージョンロードすると初期化して終了
        // if (Global.SpineInfo.Version.StartsWith("3.8") == false)
        // {
        //     state = null;
        //     skeletonRenderer = null;
        //     return;
        // }
        graphicsDevice.Clear(Microsoft.Xna.Framework.Color.Transparent);

        // 背景処理
        SpinePlayer.DrawBG(ref Global.SpriteBatch);
        Console.WriteLine("Background drawn.");

        // state.Update(Global.Info.Speed / 1000f);
        // state.Apply(skeleton);
        state.TimeScale = Global.TimeScale;

        // Scaleが変わってた場合
        if (binary != null) {
            Console.WriteLine($"Current Scale: {binary.Scale}, Global Scale: {Global.Scale}");
            if (Global.Scale != binary.Scale) {
                binary.Scale = Global.Scale;
                skeletonData = binary.ReadSkeletonData(options.SkeletonPath);
                skeleton = new Skeleton(skeletonData);
            }
        } else if (json != null) {
            Console.WriteLine($"Loading Json Skeleton");
            if (Global.Scale != json.Scale) {
                json.Scale = Global.Scale;
                skeletonData = json.ReadSkeletonData(options.SkeletonPath);
                skeleton = new Skeleton(skeletonData);
            }
        }
        Console.WriteLine($"Applied animation: {animationName}");

        skeleton.X = Global.Info.X;
        skeleton.Y = Global.Info.Y;
        // skeleton.ScaleX = Global.FlipX ? -1 : 1;
        // skeleton.ScaleY = Global.FlipY ? -1 : 1;

        // skeleton.RootBone.Rotation = Global.Rotation;
        skeleton.UpdateWorldTransform();
        skeletonRenderer.PremultipliedAlpha = Global.Info.UseAlpha;
        if (skeletonRenderer.Effect is BasicEffect)
        {
            ((BasicEffect)skeletonRenderer.Effect).Projection =
                Matrix.CreateOrthographicOffCenter(
                    0, Global.GraphicsDevice.Viewport.Width, Global.GraphicsDevice.Viewport.Height, 0, 1, 0
                );
        }
        else
        {
            skeletonRenderer.Effect.Parameters["Projection"].SetValue(
                Matrix.CreateOrthographicOffCenter(
                    0, Global.GraphicsDevice.Viewport.Width, Global.GraphicsDevice.Viewport.Height, 0, 1, 0
                )
            );
        }

        // animation
        float frameTime = frame * (1.0f / 30); // Assuming 30 FPS
        this.state.Update( frameTime );
        this.state.Apply(skeleton);
        skeleton.UpdateWorldTransform();


        Console.WriteLine("Beginning render...");
        skeletonRenderer.Begin();
        skeletonRenderer.Draw(skeleton);
        skeletonRenderer.End();

        Console.WriteLine("Render complete.");

        // 以降アニメGIF作成処理
        // 描画ターゲットの結果をファイル書き込み
        Console.WriteLine($"Preparing to render... {width}x{height} at ({skeletonX},{skeletonY})");
        SpineData.ImageFormat imageFormat = RenderingInfo.GetImageFormat(options);
        string outputPath = RenderingInfo.OutputFilePath(
            options
            , skinName
            , animationName
            , skeletonData
            , frame
            , width
            , height
            , skeletonX
            , skeletonY
        );

        SpineData.SaveRenderTarget(renderTarget, outputPath, imageFormat);
        Console.WriteLine($"Screenshot saved: {outputPath}");

        graphicsDevice.SetRenderTarget(null);
        graphicsDevice.Clear(Microsoft.Xna.Framework.Color.Transparent);

    }
}