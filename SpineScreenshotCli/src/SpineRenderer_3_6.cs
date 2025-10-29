using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Spine;
using System;
using System.IO;
using System.Linq;

namespace SpineScreenshotCli;

public class SpineRenderer_3_6 : IDisposable
{
    private readonly Options _options;
    private readonly RenderingInfo _renderingInfo;
    private String[] _skins = Array.Empty<string>();
    private String[] _animations = Array.Empty<string>();

    private HeadlessGraphicsService _graphicsService;
    private Atlas _atlas;
    private SkeletonData _skeletonData;
    private Skeleton _skeleton;
    private SkeletonRenderer _skeletonRenderer;

    private AnimationStateData _animationStateData;
    private AnimationState _animationState;

    private bool _disposed = false;

    public SpineRenderer_3_6(Options options)
    {
        this._options = options;
        this._renderingInfo = new RenderingInfo(options);
        this._renderingInfo.PremultipliedAlpha = options.UseAlpha; // Alphaで初期化する

        var info = SpineFileInfo.Load(options);

        if (string.IsNullOrEmpty(options.Skin))
        {
            // Skin指定なし
            Console.WriteLine("No skin specified, using default skin.");
            this._skins = ["default"];
        }
        else if (options.Skin.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            // 全Skinを書き出す
            this._skins = info?.skins.Items.Select(s => s.Name).ToArray() ?? Array.Empty<string>();
        }
        else
        {
            // 指定Skinのみを書き出す
            this._skins = new[] { options.Skin! };
        }


        if (string.IsNullOrEmpty(options.Animation))
        {
            // アニメーション指定なし
            Console.WriteLine("No animation specified, skipping rendering.");
            this._animations = Array.Empty<string>();
        }
        else if (!string.IsNullOrEmpty(options.Animation) && options.Animation.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            // 全アニメーションを書き出す
            this._animations = info?.animations.Items.Select(a => a.Name).ToArray() ?? Array.Empty<string>();
        } else {
            // 指定アニメーションのみを書き出す
            this._animations = new[] { options.Animation! };
        }

        this._graphicsService = new HeadlessGraphicsService(this._renderingInfo.Width, this._renderingInfo.Height);
        this._skeletonRenderer = new SkeletonRenderer(this._graphicsService.GraphicsDevice);
        this._atlas = new Atlas(options.AtlasPath!, new MonoGameTextureLoader(this._graphicsService.GraphicsDevice));
        this._skeletonData = SpineData.LoadSkeletonData(options.SkeletonPath!, this._atlas);
        this._skeleton = new Skeleton(this._skeletonData);
        this._animationStateData = new AnimationStateData(this._skeleton.Data);
        this._animationState = new AnimationState(this._animationStateData);
    }

    /// レンダリング、ファイル保存の実行
    public void Render()
    {
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
                this._RenderAnimation(skinName, animationName);
            }
        }
    }

    ///
    /// 指定アニメーションのみを書き出す処理
    /// 
    private void _RenderAnimation(string skinName, string? animationName)
    {
        var options = this._options;
        var skeleton = this._skeleton;
        var skeletonData = this._skeletonData;
        var graphicsDevice = this._graphicsService.GraphicsDevice;

        int width = this._renderingInfo.Width;
        int height = this._renderingInfo.Height;
        int skeletonX = this._renderingInfo.X;
        int skeletonY = this._renderingInfo.Y;
        var backgroundColor = this._renderingInfo.BackgroundColor;

        // Complete graphics device reset before each animation
        graphicsDevice.SetRenderTarget(null);
        graphicsDevice.Clear(Microsoft.Xna.Framework.Color.Transparent);

        // Reset all graphics device states to ensure consistency
        graphicsDevice.BlendState = BlendState.AlphaBlend;
        graphicsDevice.RasterizerState = RasterizerState.CullNone;
        graphicsDevice.DepthStencilState = DepthStencilState.None;
        graphicsDevice.SamplerStates[0] = SamplerState.LinearWrap;

        Console.WriteLine($"Output Size: {width}x{height}");
        Console.WriteLine($"Skeleton Position: ({skeletonX}, {skeletonY})");
        Console.WriteLine($"Background Color: {backgroundColor}");
        Console.WriteLine($"UseAlpha: {options.UseAlpha}, PremultipliedAlpha: {options.PremultipliedAlpha}");


        // Apply setup pose first - this is critical for consistent rendering
        skeleton.SetSlotsToSetupPose();
        Console.WriteLine("Applied setup pose to skeleton");

        // 描画ターゲットを作成し、GraphicsDeviceに設定
        using var renderTarget = new RenderTarget2D(graphicsDevice, width, height, false, SurfaceFormat.Color, DepthFormat.None);
        graphicsDevice.SetRenderTarget(renderTarget);
        graphicsDevice.Clear(backgroundColor);
        SetSkinToSkeleton(skinName, skeletonData, skeleton);

        // Complete skeleton reset to ensure clean state for each animation
        skeleton.SetToSetupPose();
        skeleton.SetSlotsToSetupPose();

        // Skeletonにアニメーションを設定
        SetAnimationToSkeleton( animationName, options, skeletonData, skeleton );

        // 指定フレームで描画
        float fps = options.Fps > 0 ? options.Fps : 30.0f; // デフォルト30fps
        int range = options.Range > 0 ? Math.Max(options.Range, 0) : 0;
        int frame = options.Frame > 1 ? options.Frame - 1 : 0;
        int interval = options.Interval > 1 ? Math.Max(options.Interval, 1) : 1;
        SetAnimationFrameToSkeleton(animationName, frame, fps, skeletonData, skeleton);

        // スロットとアタッチメントをデバッグ表示
        // CheckVisibleSlotsAndAttachments(skeleton);
        for( int i=frame; i<=frame+range; i+=interval ) {
            graphicsDevice.SetRenderTarget(renderTarget);
            graphicsDevice.Clear(backgroundColor);

            // フレーム進行
            SetAnimationFrameToSkeleton(animationName, i, fps, skeletonData, skeleton);
            // 描画先をリセット
            graphicsDevice.SetRenderTarget(null);

            // 描画ターゲットの結果をファイル書き込み
            SpineData.ImageFormat imageFormat = RenderingInfo.GetImageFormat( options );
            string outputPath = RenderingInfo.OutputFilePath(
                options
                , skinName
                , animationName
                , skeletonData
                , i
                , width
                , height
                , skeletonX
                , skeletonY
            );
            SpineData.SaveRenderTarget(renderTarget, outputPath, imageFormat);
            Console.WriteLine($"Screenshot saved: {outputPath}");

            graphicsDevice.SetRenderTarget(null);
            graphicsDevice.Clear(backgroundColor);
        }


        // Reset graphics device state after rendering to prevent interference between animations
        graphicsDevice.SetRenderTarget(null);
        graphicsDevice.Clear(Microsoft.Xna.Framework.Color.Transparent);
        
        // Reset all graphics states to default for next animation
        graphicsDevice.BlendState = BlendState.Opaque;
        graphicsDevice.RasterizerState = RasterizerState.CullCounterClockwise;
        graphicsDevice.DepthStencilState = DepthStencilState.Default;
        graphicsDevice.SamplerStates[0] = SamplerState.LinearWrap;
        
        // Cleanup - render target is disposed automatically by using statement
        // Do not dispose shared atlas - it will be disposed by the caller
        // SkeletonRenderer doesn't require explicit disposal in this version
        Console.WriteLine($"Completed processing animation: {animationName}");
    }

    /// スケルトンにスキンを設定する
    private static void SetSkinToSkeleton(String skinName, SkeletonData skeletonData, Skeleton skeleton) {
        var skin = skeletonData.FindSkin(skinName);
        if (skin != null)
        {
            skeleton.SetSkin(skin);
            skeleton.SetSlotsToSetupPose();
            Console.WriteLine($"Applied skin: {skinName}");
        }
        else
        {
            Console.WriteLine($"Warning: Skin '{skinName}' not found. Available skins: {string.Join(", ", skeletonData.Skins.Select(s => s.Name))}");
        }
    }

    /// スケルトンにアニメーションを設定する
    private void SetAnimationToSkeleton(string animationName, Options options, SkeletonData skeletonData, Skeleton skeleton) {
        var animationStateData = this._animationStateData;
        var animationState = this._animationState;

        // 初期化
        animationState.ClearTracks();
        Console.WriteLine("Cleared animation tracks");
        var isLoop = false;
        animationState.SetAnimation(0, animationName, isLoop);

        animationState.Apply(skeleton);
        skeleton.X = this._renderingInfo.X;
        skeleton.Y = this._renderingInfo.Y;
        // Flipは未実装
        // skeleton.FlipX = options.FlipX;
        // skeleton.FlipY = options.FlipY;

        // Rotationは未実装
        // skeleton.RootBone.Rotation = options.Rotation;

        skeleton.UpdateWorldTransform();
        var skeletonRenderer = this._skeletonRenderer;
        skeletonRenderer.PremultipliedAlpha = false;

        // 座標系設定。左上を原点とする
        ((BasicEffect)skeletonRenderer.Effect).Projection = Matrix.CreateOrthographicOffCenter(0, this._renderingInfo.Width, this._renderingInfo.Height, 0, 1, 0);
    }

    private void SetAnimationFrameToSkeleton(string animationName, int frame, float fps, SkeletonData skeletonData, Skeleton skeleton) {
        var animationState = this._animationState;
        var skeletonRenderer = this._skeletonRenderer;
        animationState.SetAnimation(0, animationName, false);

        skeletonRenderer.PremultipliedAlpha = true;
        // フレーム指定
        if (frame > 0)
        {
            var animation = skeletonData.FindAnimation(animationName);

            // Calculate time based on frame index (0-based)
            float frameTime = frame * (1.0f / fps); // Assuming 30 FPS

            // Clamp time to animation duration
            frameTime = Math.Min(frameTime, animation.Duration);

            animationState.Update(frameTime);
            animationState.Apply(skeleton);
            Console.WriteLine($"Applied animation: {animationName} at frame {frame} (time: {frameTime:F3}s, max: {animation.Duration:F3}s)");
        }
        else
        {
            // If no specific frame, just apply the first frame of animation
            animationState.Update(0.0f);
            animationState.Apply(skeleton);
            Console.WriteLine($"Applied animation: {animationName} at first frame");
        }
        skeleton.UpdateWorldTransform();

        // 描画
        skeletonRenderer.Begin();
        skeletonRenderer.Draw(skeleton);
        skeletonRenderer.End();
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing)
        {
            _graphicsService?.Dispose();
            _atlas?.Dispose();
            // SkeletonRenderer does not implement IDisposable in this version
        }
        // No unmanaged resources to release
        _disposed = true;
    }
}