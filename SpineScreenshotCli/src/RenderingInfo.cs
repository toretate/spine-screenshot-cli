using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Spine;
using System.Drawing;
using System.IO;
using System;

namespace SpineScreenshotCli;

public class RenderingInfo {
    private int _width = 800;
    private int _height = 800;

    public int Width { get { return this._width; } }
    public int Height { get { return this._height; } }

    public Size RenderSize
    {
        get { return new Size(Width, Height); }
        set
        {
            _width = value.Width;
            _height = value.Height;
        }
    }

    public int X { get; set; }
    public int Y { get; set; }

    public Microsoft.Xna.Framework.Color BackgroundColor { get; }

    public int Speed = 1;

    public bool PremultipliedAlpha { get; set; }
    public bool UseAlpha { get; set; }

    public RenderingInfo( Options options ) {
        // サイズ指定
        var sizeParts = options.Size.Split(',');
        if (sizeParts.Length != 2 || !int.TryParse(sizeParts[0], out var width) || !int.TryParse(sizeParts[1], out var height))
        {
            // サイズ指定が不正な場合エラー
            throw new ArgumentException($"Invalid size format: {options.Size}. Expected format: width,height");
        }
        this._width = width;
        this._height = height;

        // 位置指定
        int x, y;
        if (string.IsNullOrEmpty(options.Position))
        {
            // 位置指定がない場合は中央
            x = width / 2;
            y = height / 2;
        }
        else
        {
            var positionParts = options.Position.Split(',');
            if (positionParts.Length != 2 || !int.TryParse(positionParts[0], out x) || !int.TryParse(positionParts[1], out y))
            {
                // 位置指定が不正な場合はエラー
                throw new ArgumentException($"Invalid position format: {options.Position}. Expected format: x,y");
            }
        }
        this.X = x;
        this.Y = y;

        Microsoft.Xna.Framework.Color backgroundColor = Microsoft.Xna.Framework.Color.Transparent;
        if (!string.IsNullOrEmpty(options.BackgroundColor))
        {
            if (TryParseHexColor("#" + options.BackgroundColor, out var parsedColor))
            {
                Console.WriteLine($"Using background color: {options.BackgroundColor}");
                backgroundColor = parsedColor;
            }
            else
            {
                throw new ArgumentException($"Invalid background color format: {options.BackgroundColor}. Expected format: #RRGGBB");
            }
        }
        // When UseAlpha is enabled but background color is specified, ensure background is opaque
        if (options.UseAlpha && !string.IsNullOrEmpty(options.BackgroundColor) && backgroundColor != Microsoft.Xna.Framework.Color.Transparent)
        {
            // Ensure background color has full alpha for proper rendering
            backgroundColor = new Microsoft.Xna.Framework.Color((byte)backgroundColor.R, (byte)backgroundColor.G, (byte)backgroundColor.B, (byte)255);
        }
        this.BackgroundColor = backgroundColor;

        this.PremultipliedAlpha = options.PremultipliedAlpha;
        this.UseAlpha = options.UseAlpha;
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

    public static String OutputFilePath(
        Options options
        , String skinName
        , String animationName
        , SkeletonData skeletonData
        , int frame
        , int width
        , int height
        , int x
        , int y
    ) {
        string outputPath = string.Empty;
        if (!string.IsNullOrEmpty(options.OutputFileName))
        {
            string[,] templateDefs = new string[,]
            {
                { "_SKIN_", skinName },
                { "_ANIME_", animationName },
                { "_FRAME_", frame.ToString() },
                { "_XY_", $"{x}x${y}" },
                { "_SIZE_", $"{width}x{height}" },
                { "_ATLASNAME_", Path.GetFileNameWithoutExtension(options.AtlasPath) },
                { "_SKELETONNAME_", Path.GetFileNameWithoutExtension(options.SkeletonPath) }
            };

            // Use specified filename with _ANIME_ placeholder replacement
            string outputFileName = options.OutputFileName;
            for (var i = 0; i < templateDefs.GetLength(0); i++)
            {
                var key = templateDefs[i,0];
                var value = templateDefs[i,1];
                if (!string.IsNullOrEmpty(value) && outputFileName.Contains(key))
                {
                    outputFileName = outputFileName.Replace(key, value);
                }
            }
            outputPath = Path.Combine(options.OutputDir!, outputFileName);

            // Format指定による拡張子変更
            if( Path.HasExtension(outputPath) ) {
                var extension = options.Format.ToLower() switch
                {
                    "png" => "png",
                    "webp" => "webp",
                    _ => "png" // default fallback
                };
                outputPath = Path.ChangeExtension(outputPath, extension);
            }
        }
        else
        {
            // Auto-generate filename
            string fileName = CreateOutputFileName(options, skeletonData, width, height, skinName, animationName);
            outputPath = Path.Combine(options.OutputDir!, fileName);
        }
        return outputPath;
    }

    private static string CreateOutputFileName(Options options, SkeletonData skeletonData, int width, int height, string skinName, string? animationName = null)
    {
        var skeletonName = Path.GetFileNameWithoutExtension(options.SkeletonPath);
        var animName = animationName ?? options.Animation ?? "none";
        var frame = options.Frame;
        
        // Determine file extension based on format
        var extension = options.Format.ToLower() switch
        {
            "png" => "png",
            "webp" => "webp",
            _ => "png" // default fallback
        };
        
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
        
        return $"{skeletonName}_skin-{skinName}_anim-{animName}_frame-{frame}_{width}x{height}_regions-{totalRegions}of0.{extension}";
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

    public static SpineData.ImageFormat GetImageFormat( Options options ) {
        switch ( options.Format.ToLower() ) {
            case "png":
                return SpineData.ImageFormat.Png;
            case "webp":
                return SpineData.ImageFormat.WebP;
            default:
                return SpineData.ImageFormat.Png;
        }
    }
}
