using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Spine;
using System.IO;

namespace SpineScreenshotCli;

public class SpineRenderer
{
    public static void RenderSpineScreenshot(Options options)
    {
        if (!string.IsNullOrEmpty(options.Animation) && options.Animation.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            // 全アニメーションを書き出す
            Console.WriteLine("Rendering ALL animations...");
            RenderAllAnimations(options);
        } else {
            // １アニメーションのみを書き出す
            Console.WriteLine($"Rendering SINGLE animation: '{options.Animation}'");
            RenderSingleAnimation(options, options.Animation);
        }
    }

    ///
    /// 全アニメーションを書き出す処理
    /// 
    private static void RenderAllAnimations(Options options)
    {
        var info = SpineFileInfo.Load( options );
        foreach ( var animation in info.animations ) {
            Console.WriteLine($"Rendering animation: {animation.Name}");
            RenderSingleAnimation(options, animation.Name);
        }
        Console.WriteLine("All animations rendered successfully.");
    }

    ///
    /// 指定アニメーションのみを書き出す処理
    /// 
    private static void RenderSingleAnimation(Options options, string? animationName)
    {
        var renderingInfo = new RenderingInfo(options);
        // Create headless graphics service for single animation rendering
        using ( var graphicsService = new HeadlessGraphicsService(renderingInfo.Width, renderingInfo.Height) ) {
            var graphicsDevice = graphicsService.GraphicsDevice;

            // Load Spine Atlas with MonoGame texture loader
            var spineAtlas = null as Atlas;
            try {
                spineAtlas = new Atlas(options.AtlasPath!, new MonoGameTextureLoader(graphicsDevice));
                var spineSkeletonData = SpineData.LoadSkeletonData(options.SkeletonPath!, spineAtlas);

                RenderSingleAnimationWithGraphicsDevice(graphicsDevice, spineSkeletonData, animationName, options);
            } finally {
                spineAtlas?.Dispose();
            }
        }
    }

    ///
    /// GraphicsDevice に画像を書き込む
    /// 
    private static void RenderSingleAnimationWithGraphicsDevice(GraphicsDevice graphicsDevice, SkeletonData skeletonData, string? animationName, Options options)
    {
        var renderingInfo = new RenderingInfo(options);
        int width = renderingInfo.Width;
        int height = renderingInfo.Height;
        int skeletonX = renderingInfo.X;
        int skeletonY = renderingInfo.Y;
        var backgroundColor = renderingInfo.BackgroundColor;

        // Complete graphics device reset before each animation
        graphicsDevice.SetRenderTarget(null);
        graphicsDevice.Clear(Microsoft.Xna.Framework.Color.Black);

        Console.WriteLine($"Output Size: {width}x{height}");
        Console.WriteLine($"Skeleton Position: ({skeletonX}, {skeletonY})");
        Console.WriteLine($"Background Color: {backgroundColor}");
        Console.WriteLine($"UseAlpha: {options.UseAlpha}, PremultipliedAlpha: {options.PremultipliedAlpha}");
        Console.WriteLine($"Loaded skeleton with {skeletonData.Skins.Count} skins, {skeletonData.Animations.Count} animations");

        // Create skeleton and animation state
        var skeleton = new Skeleton(skeletonData);

        // Apply setup pose first - this is critical for consistent rendering
        Console.WriteLine("Applied setup pose to skeleton");

        // skeletonにskinとAnimationを設定する
        SetSkinToSkeleton(options, skeletonData, skeleton);
        SetAnimationToSkeleton( animationName, options, skeletonData, skeleton );

        // Set up position and ensure proper skeleton state
        // Use MonoGame coordinate system (top-left origin)
        skeleton.X = skeletonX;
        skeleton.Y = skeletonY;

        skeleton.SetToSetupPose();
        skeleton.SetSlotsToSetupPose();

        // Ensure final world transform update after all changes
        skeleton.UpdateWorldTransform();
        Console.WriteLine($"Final skeleton state - Position: ({skeleton.X}, {skeleton.Y})");

        // Debug: Output skeleton information
        Console.WriteLine($"Skeleton position: ({skeleton.X}, {skeleton.Y})");
        Console.WriteLine($"Skeleton color: R={skeleton.R}, G={skeleton.G}, B={skeleton.B}, A={skeleton.A}");
        Console.WriteLine($"Canvas size: {width}x{height}, Position: ({skeletonX}, {skeletonY})");
        Console.WriteLine($"Skeleton draw order count: {skeleton.DrawOrder.Count}");
        
        // スロットとアタッチメントをデバッグ表示
        CheckVisibleSlotsAndAttachments(skeleton);

        // Calculate and display skeleton bounds
        var bounds = new SkeletonBounds();
        try
        {
            bounds.Update(skeleton, true);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Error calculating skeleton bounds: {ex.Message}");
        }

        // Create render target
        using var renderTarget = new RenderTarget2D(graphicsDevice, width, height, false, SurfaceFormat.Color, DepthFormat.None);

        // Configure alpha blending mode based on UseAlpha option
        var blendState = options.UseAlpha 
            ? (options.PremultipliedAlpha ? BlendState.AlphaBlend : BlendState.NonPremultiplied)
            : BlendState.Opaque;

        // Render with proper state management
        try
        {
            // Reset graphics device state before rendering
            graphicsDevice.SetRenderTarget(renderTarget);
            graphicsDevice.Clear(backgroundColor);
            
            // Reset viewport to ensure proper rendering area
            graphicsDevice.Viewport = new Viewport(0, 0, width, height);
            
            // Set all rendering states explicitly
            graphicsDevice.BlendState = blendState;
            graphicsDevice.RasterizerState = RasterizerState.CullNone;
            graphicsDevice.DepthStencilState = DepthStencilState.None;
            graphicsDevice.SamplerStates[0] = SamplerState.LinearWrap;
            
            Console.WriteLine($"Starting render for animation: {animationName}");
            Console.WriteLine($"Viewport: {graphicsDevice.Viewport.Width}x{graphicsDevice.Viewport.Height}");
            Console.WriteLine($"BlendState: {graphicsDevice.BlendState}");
            
            // Create a new spine renderer for each render to avoid state issues
            var skeletonRenderer = new SkeletonRenderer(graphicsDevice);
            skeletonRenderer.PremultipliedAlpha = options.PremultipliedAlpha;

            // Configure BasicEffect projection matrix for proper coordinate mapping
            if (skeletonRenderer.Effect is BasicEffect basicEffect)
            {
                // Use standard MonoGame coordinate system (top-left origin, Y down)
                basicEffect.Projection = Matrix.CreateOrthographicOffCenter(0, width, height, 0, -1, 1);
                basicEffect.View = Matrix.Identity;
                basicEffect.World = Matrix.Identity;
                Console.WriteLine($"Set projection matrix for {width}x{height} viewport (Spine coordinate system)");
            }
            
            skeletonRenderer.Begin();
            skeletonRenderer.Draw(skeleton);
            skeletonRenderer.End();
            
            Console.WriteLine($"Completed render for animation: {animationName}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during rendering animation {animationName}: {ex.Message}");
            Console.WriteLine($"Exception details: {ex}");
            throw;
        }

        graphicsDevice.SetRenderTarget(null);

        // Save render target
        Console.WriteLine($"About to save render target. Size: {renderTarget.Width}x{renderTarget.Height}");
        Console.WriteLine($"RenderTarget Format: {renderTarget.Format}");
        Console.WriteLine($"RenderTarget Usage: {renderTarget.LevelCount}");

        // レンダリング結果をチェック
        {
            var checkData = new Microsoft.Xna.Framework.Color[100]; // 最初の100ピクセルをチェック
            renderTarget.GetData(0, new Microsoft.Xna.Framework.Rectangle(0, 0, 10, 10), checkData, 0, 100);
            var nonTransparentCount = checkData.Count(c => c.A > 0);
            Console.WriteLine($"Sample check: {nonTransparentCount}/100 pixels are non-transparent");
        }

        // ファイル書き込み
        SpineData.ImageFormat imageFormat = RenderingInfo.GetImageFormat( options );
        string outputPath = RenderingInfo.OutputFilePath( options, animationName, skeletonData, width, height );
        SpineData.SaveRenderTarget(renderTarget, outputPath, imageFormat);
        Console.WriteLine($"Screenshot saved: {outputPath}");

        // Reset graphics device state after rendering to prevent interference
        graphicsDevice.SetRenderTarget(null);
        graphicsDevice.Clear(Microsoft.Xna.Framework.Color.Black);
        
        // Cleanup - render target is disposed automatically by using statement
        // Do not dispose shared atlas - it will be disposed by the caller
        // SkeletonRenderer doesn't require explicit disposal in this version
        Console.WriteLine($"Completed processing animation: {animationName}");
    }


    /// Debug: Check visible slots and attachments  
    private static void CheckVisibleSlotsAndAttachments(Skeleton skeleton) {
        int visibleSlots = 0;
        for (int i = 0; i < skeleton.DrawOrder.Count; i++)
        {
            var slot = skeleton.DrawOrder.Items[i];
            if (slot.Attachment != null)
            {
                visibleSlots++;
                Console.WriteLine($"  Slot[{i}]: {slot.Data.Name} -> {slot.Attachment.Name} (Color: {slot.R:F2}, {slot.G:F2}, {slot.B:F2}, {slot.A:F2})");
                
                // Additional debug for RegionAttachment
                if (slot.Attachment is RegionAttachment regionAttachment)
                {
                    Console.WriteLine($"    RegionAttachment: X={regionAttachment.X}, Y={regionAttachment.Y}, Width={regionAttachment.Width}, Height={regionAttachment.Height}");
                    Console.WriteLine($"    Scale: X={regionAttachment.ScaleX}, Y={regionAttachment.ScaleY}");
                    Console.WriteLine($"    Rotation: {regionAttachment.Rotation}");
                }
            }
        }
        Console.WriteLine($"Total visible slots: {visibleSlots}");
    }

    /// スケルトンにスキンを設定する
    private static void SetSkinToSkeleton(Options options, SkeletonData skeletonData, Skeleton skeleton) {
        if (!string.IsNullOrEmpty(options.Skin))
        {
            var skin = skeletonData.FindSkin(options.Skin);
            if (skin != null)
            {
                skeleton.SetSkin(skin);
                skeleton.SetSlotsToSetupPose();
                Console.WriteLine($"Applied skin: {options.Skin}");
            }
            else
            {
                Console.WriteLine($"Warning: Skin '{options.Skin}' not found. Available skins: {string.Join(", ", skeletonData.Skins.Select(s => s.Name))}");
            }
        }
    }

    /// スケルトンにアニメーションを設定する
    private static void SetAnimationToSkeleton( string animationName, Options options, SkeletonData skeletonData, Skeleton skeleton ) {
        var animationStateData = new AnimationStateData(skeletonData);
        var animationState = new AnimationState(animationStateData);

        // 初期化
        animationState.ClearTracks();
        Console.WriteLine("Cleared animation tracks");

        if (!string.IsNullOrEmpty(animationName))
        {
            var animation = skeletonData.FindAnimation(animationName);
            if (animation != null)
            {
                // Set animation on track 0
                animationState.SetAnimation(0, animation, false);
                Console.WriteLine($"Set animation: {animationName}");
                
                // Apply frame timing if specified
                if (options.Frame > 0)
                {
                    float frameTime = (options.Frame - 1) * (1.0f / 30.0f); // Assuming 30 FPS
                    animationState.Update(frameTime);
                    animationState.Apply(skeleton);
                    Console.WriteLine($"Applied animation: {animationName} at frame {options.Frame} (time: {frameTime:F3}s)");
                }
                else
                {
                    // If no specific frame, just apply the first frame of animation
                    animationState.Update(0.0f);
                    animationState.Apply(skeleton);
                    Console.WriteLine($"Applied animation: {animationName} at first frame");
                }
                
                // Update world transform after animation application
                skeleton.UpdateWorldTransform();
                Console.WriteLine($"Updated world transform for animation: {animationName}");
            }
            else
            {
                Console.WriteLine($"Warning: Animation '{animationName}' not found. Available animations: {string.Join(", ", skeletonData.Animations.Select(a => a.Name))}");
            }
        }
    }

}