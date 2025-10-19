using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Spine;
using System.IO;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace SpineScreenshotCli;

public class SpineRenderer
{
    public static void ShowFileInfo(Options options)
    {
        try
        {
            Console.WriteLine("Spine File Information:");
            Console.WriteLine($"Atlas: {options.AtlasPath}");
            Console.WriteLine($"Skeleton: {options.SkeletonPath}");
            
            if (!string.IsNullOrEmpty(options.AtlasPath) && File.Exists(options.AtlasPath))
            {
                // Create a dummy graphics service just for loading
                using var graphicsService = new HeadlessGraphicsService(256, 256);
                var atlas = new Atlas(options.AtlasPath, new MonoGameTextureLoader(graphicsService.GraphicsDevice));
                
                Console.WriteLine($"Atlas loaded successfully");
                
                if (!string.IsNullOrEmpty(options.SkeletonPath) && File.Exists(options.SkeletonPath))
                {
                    var skeletonData = LoadSpineSkeletonData(options.SkeletonPath, atlas);
                    Console.WriteLine($"Skeleton loaded:");
                    Console.WriteLine($"  Skins: {string.Join(", ", skeletonData.Skins.Select(s => s.Name))}");
                    Console.WriteLine($"  Animations: {string.Join(", ", skeletonData.Animations.Select(a => a.Name))}");
                    Console.WriteLine($"  Bones: {skeletonData.Bones.Count}");
                    Console.WriteLine($"  Slots: {skeletonData.Slots.Count}");
                }
                
                atlas.Dispose();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading file info: {ex.Message}");
        }
    }

    public static void RenderSpineScreenshot(Options options)
    {
        // Parse size
        var sizeParts = options.Size.Split(',');
        if (sizeParts.Length != 2 || !int.TryParse(sizeParts[0], out var width) || !int.TryParse(sizeParts[1], out var height))
        {
            throw new ArgumentException($"Invalid size format: {options.Size}. Expected format: width,height");
        }

        // Parse position if provided
        int skeletonX = width / 2;   // Default to center
        int skeletonY = height / 2;  // Default to center
        
        if (!string.IsNullOrEmpty(options.Position))
        {
            var positionParts = options.Position.Split(',');
            if (positionParts.Length == 2 && 
                int.TryParse(positionParts[0].Trim(), out var x) && 
                int.TryParse(positionParts[1].Trim(), out var y))
            {
                skeletonX = x;
                skeletonY = y;
            }
            else
            {
                Console.WriteLine($"Warning: Invalid position format '{options.Position}'. Using center position.");
            }
        }

        // Parse background color if provided
        Microsoft.Xna.Framework.Color backgroundColor = Microsoft.Xna.Framework.Color.Transparent;
        if (!string.IsNullOrEmpty(options.BackgroundColor))
        {
            if (TryParseHexColor(options.BackgroundColor, out backgroundColor))
            {
                Console.WriteLine($"Using background color: {options.BackgroundColor}");
            }
            else
            {
                Console.WriteLine($"Warning: Invalid background color format '{options.BackgroundColor}'. Using transparent background.");
                backgroundColor = Microsoft.Xna.Framework.Color.Transparent;
            }
        }
        
        Console.WriteLine($"Output Size: {width}x{height}");
        Console.WriteLine($"Skeleton Position: ({skeletonX}, {skeletonY})");
        Console.WriteLine($"Background Color: {backgroundColor}");
        Console.WriteLine($"UseAlpha: {options.UseAlpha}, PremultipliedAlpha: {options.PremultipliedAlpha}");

        // When UseAlpha is enabled but background color is specified, ensure background is opaque
        if (options.UseAlpha && !string.IsNullOrEmpty(options.BackgroundColor) && backgroundColor != Microsoft.Xna.Framework.Color.Transparent)
        {
            // Ensure background color has full alpha for proper rendering
            backgroundColor = new Microsoft.Xna.Framework.Color((byte)backgroundColor.R, (byte)backgroundColor.G, (byte)backgroundColor.B, (byte)255);
        }

        // Create headless graphics service
        using var graphicsService = new HeadlessGraphicsService(width, height);
        var graphicsDevice = graphicsService.GraphicsDevice;

        // Load Spine Atlas with MonoGame texture loader
        var spineAtlas = new Atlas(options.AtlasPath!, new MonoGameTextureLoader(graphicsDevice));
        
        // Load skeleton data
        SkeletonData spineSkeletonData = LoadSpineSkeletonData(options.SkeletonPath!, spineAtlas);
        Console.WriteLine($"Loaded skeleton with {spineSkeletonData.Skins.Count} skins, {spineSkeletonData.Animations.Count} animations");

        // Create skeleton and animation state
        var skeleton = new Skeleton(spineSkeletonData);
        var animationStateData = new AnimationStateData(spineSkeletonData);
        var animationState = new AnimationState(animationStateData);
        
        // Apply setup pose first
        skeleton.SetToSetupPose();
        Console.WriteLine("Applied setup pose to skeleton");

        // Set skin if specified
        if (!string.IsNullOrEmpty(options.Skin))
        {
            var skin = spineSkeletonData.FindSkin(options.Skin);
            if (skin != null)
            {
                skeleton.SetSkin(skin);
                skeleton.SetSlotsToSetupPose();
                Console.WriteLine($"Applied skin: {options.Skin}");
            }
            else
            {
                Console.WriteLine($"Warning: Skin '{options.Skin}' not found. Available skins: {string.Join(", ", spineSkeletonData.Skins.Select(s => s.Name))}");
            }
        }

        // Set animation if specified
        if (!string.IsNullOrEmpty(options.Animation))
        {
            var animation = spineSkeletonData.FindAnimation(options.Animation);
            if (animation != null)
            {
                animationState.SetAnimation(0, animation, false);
                
                // Apply frame timing if specified
                if (options.Frame > 0)
                {
                    float frameTime = (options.Frame - 1) * (1.0f / 30.0f); // Assuming 30 FPS
                    animationState.Update(frameTime);
                    animationState.Apply(skeleton);
                    Console.WriteLine($"Applied animation: {options.Animation} at frame {options.Frame} (time: {frameTime:F3}s)");
                }
            }
            else
            {
                Console.WriteLine($"Warning: Animation '{options.Animation}' not found. Available animations: {string.Join(", ", spineSkeletonData.Animations.Select(a => a.Name))}");
            }
        }

        // Update skeleton
        skeleton.UpdateWorldTransform();

        // Set up position  
        skeleton.X = skeletonX;
        skeleton.Y = skeletonY;
        
        // Debug: Output skeleton information
        Console.WriteLine($"Skeleton position: ({skeleton.X}, {skeleton.Y})");
        Console.WriteLine($"Skeleton color: R={skeleton.R}, G={skeleton.G}, B={skeleton.B}, A={skeleton.A}");
        Console.WriteLine($"Canvas size: {width}x{height}, Position: ({skeletonX}, {skeletonY})");
        Console.WriteLine($"Skeleton draw order count: {skeleton.DrawOrder.Count}");
        
        // Debug: Check visible slots and attachments
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
        
        // Calculate and display skeleton bounds
        skeleton.UpdateWorldTransform();
        var bounds = new SkeletonBounds();
        bounds.Update(skeleton, true);
        Console.WriteLine($"Skeleton bounds: MinX={bounds.MinX}, MinY={bounds.MinY}, Width={bounds.Width}, Height={bounds.Height}");

        // Create render target
        var renderTarget = new RenderTarget2D(graphicsDevice, width, height, false, SurfaceFormat.Color, DepthFormat.None);

        // Create spine renderer
        var skeletonRenderer = new SkeletonRenderer(graphicsDevice);
        skeletonRenderer.PremultipliedAlpha = options.PremultipliedAlpha;
        
        // Configure BasicEffect projection matrix for proper coordinate mapping
        // Use Spine coordinate system (left-bottom origin) instead of MonoGame (left-top origin)
        if (skeletonRenderer.Effect is BasicEffect basicEffect)
        {
            basicEffect.Projection = Matrix.CreateOrthographicOffCenter(0, width, 0, height, 0, 1);
            Console.WriteLine($"Set projection matrix for {width}x{height} viewport (Spine coordinate system)");
        }

        // Configure alpha blending mode based on UseAlpha option
        var blendState = options.UseAlpha 
            ? (options.PremultipliedAlpha ? BlendState.AlphaBlend : BlendState.NonPremultiplied)
            : BlendState.Opaque;

        // Render
        graphicsDevice.SetRenderTarget(renderTarget);
        graphicsDevice.Clear(backgroundColor);
        
        // Set blend state explicitly before rendering
        graphicsDevice.BlendState = blendState;
        
        skeletonRenderer.Begin();
        skeletonRenderer.Draw(skeleton);
        skeletonRenderer.End();

        // Save to file
        graphicsDevice.SetRenderTarget(null);
        
        // Create output filename
        string fileName = CreateOutputFileName(options, spineSkeletonData, width, height);
        string outputPath = Path.Combine(options.OutputDir!, fileName);
        
        // Save render target to PNG
        SaveRenderTargetToPng(renderTarget, outputPath);
        
        Console.WriteLine($"Screenshot saved: {outputPath}");

        // Cleanup
        renderTarget.Dispose();
        spineAtlas.Dispose();
    }

    private static SkeletonData LoadSpineSkeletonData(string skeletonPath, Atlas atlas)
    {
        string extension = Path.GetExtension(skeletonPath).ToLower();
        
        if (extension == ".json")
        {
            var json = new SkeletonJson(atlas);
            return json.ReadSkeletonData(skeletonPath);
        }
        else if (extension == ".skel")
        {
            var binary = new SkeletonBinary(atlas);
            return binary.ReadSkeletonData(skeletonPath);
        }
        else
        {
            throw new ArgumentException($"Unsupported skeleton file format: {extension}");
        }
    }

    private static string CreateOutputFileName(Options options, SkeletonData skeletonData, int width, int height)
    {
        var skeletonName = Path.GetFileNameWithoutExtension(options.SkeletonPath);
        var skinName = options.Skin ?? "default";
        var animName = options.Animation ?? "none";
        var frame = options.Frame;
        
        // Count total regions/slots
        int totalRegions = 0;
        if (!string.IsNullOrEmpty(options.Skin))
        {
            var skin = skeletonData.FindSkin(options.Skin);
            if (skin != null)
            {
                totalRegions = CountSkinAttachments(skin);
            }
        }
        
        return $"{skeletonName}_skin-{skinName}_anim-{animName}_frame-{frame}_{width}x{height}_regions-{totalRegions}of0.png";
    }

    private static int CountSkinAttachments(Skin skin)
    {
        int count = 0;
        // Use the attachments field directly since GetAttachments() may not be available
        var attachments = skin.Attachments;
        if (attachments != null)
        {
            foreach (var entry in attachments)
            {
                if (entry.Value is RegionAttachment || entry.Value is MeshAttachment)
                {
                    count++;
                }
            }
        }
        return count;
    }

    private static void SaveRenderTargetToPng(RenderTarget2D renderTarget, string path)
    {
        // Get the data from render target
        var data = new Microsoft.Xna.Framework.Color[renderTarget.Width * renderTarget.Height];
        renderTarget.GetData(data);

        // Create directory if it doesn't exist
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        // Create ImageSharp image
        using var image = new Image<Rgba32>(renderTarget.Width, renderTarget.Height);
        
        // Convert MonoGame color data to ImageSharp format
        for (int y = 0; y < renderTarget.Height; y++)
        {
            for (int x = 0; x < renderTarget.Width; x++)
            {
                int index = y * renderTarget.Width + x;
                var color = data[index];
                image[x, y] = new Rgba32(color.R, color.G, color.B, color.A);
            }
        }

        // Save as PNG
        image.SaveAsPng(path);
    }

    private static bool TryParseHexColor(string hexColor, out Microsoft.Xna.Framework.Color color)
    {
        color = Microsoft.Xna.Framework.Color.Transparent;
        
        if (string.IsNullOrEmpty(hexColor))
            return false;
            
        // Remove # if present
        if (hexColor.StartsWith("#"))
            hexColor = hexColor.Substring(1);
            
        // Must be exactly 6 characters for RRGGBB
        if (hexColor.Length != 6)
            return false;
            
        try
        {
            int r = Convert.ToInt32(hexColor.Substring(0, 2), 16);
            int g = Convert.ToInt32(hexColor.Substring(2, 2), 16);
            int b = Convert.ToInt32(hexColor.Substring(4, 2), 16);
            
            color = new Microsoft.Xna.Framework.Color((byte)r, (byte)g, (byte)b, (byte)255);
            return true;
        }
        catch
        {
            return false;
        }
    }

}