using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Spine;
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Formats.Webp;

namespace SpineScreenshotCli;

public static class SpineData
{
    public enum ImageFormat
    {
        Png,
        WebP
    }
    /// <summary>
    /// レンダーターゲットを指定した形式で保存する汎用メソッド
    /// </summary>
    public static void SaveRenderTarget(RenderTarget2D renderTarget, string path, ImageFormat format)
    {
        switch (format)
        {
            case ImageFormat.Png:
                SaveRenderTargetToPng(renderTarget, path);
                break;
            case ImageFormat.WebP:
                SaveRenderTargetToWebp(renderTarget, path);
                break;
            default:
                throw new ArgumentException($"Unsupported image format: {format}");
        }
    }

    /// <summary>
    /// レンダーターゲットをPNG形式で保存
    /// </summary>
    private static void SaveRenderTargetToPng(RenderTarget2D renderTarget, string path)
    {
        // Create directory if it doesn't exist
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }
        
        var image = CreateImageFromRenderTarget(renderTarget);
        
        // Save as PNG
        Console.WriteLine($"Saving PNG to: {path}");
        image.SaveAsPng(path);
        image.Dispose();
    }

    /// <summary>
    /// レンダーターゲットをWebP形式で保存
    /// </summary>
    private static void SaveRenderTargetToWebp(RenderTarget2D renderTarget, string path)
    {
        // Create directory if it doesn't exist
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }
        
        var image = CreateImageFromRenderTarget(renderTarget);
        
        // Save as WebP
        Console.WriteLine($"Saving WebP to: {path}");
        var encoder = new WebpEncoder
        {
            Quality = 90, // WebPの品質設定（0-100）
            Method = WebpEncodingMethod.BestQuality
        };
        image.SaveAsWebp(path, encoder);
        image.Dispose();
    }

    /// <summary>
    /// レンダーターゲットからImageSharpのImageオブジェクトを作成する共通メソッド
    /// </summary>
    private static Image<Rgba32> CreateImageFromRenderTarget(RenderTarget2D renderTarget)
    {
        // Get the data from render target
        var data = new Microsoft.Xna.Framework.Color[renderTarget.Width * renderTarget.Height];
        Console.WriteLine($"Getting render target data, size: {renderTarget.Width}x{renderTarget.Height}");
        renderTarget.GetData(data);
        Console.WriteLine($"Got {data.Length} pixels from render target");

        // Directory creation is handled in the SaveAs methods

        // Create ImageSharp image
        var image = new Image<Rgba32>(renderTarget.Width, renderTarget.Height);
        
        // Convert MonoGame color data to ImageSharp format
        Console.WriteLine($"Converting {data.Length} pixels to ImageSharp format...");
        
        // サンプルピクセルをチェック
        var sampleColors = new List<Microsoft.Xna.Framework.Color>();
        for (int i = 0; i < Math.Min(10, data.Length); i++)
        {
            sampleColors.Add(data[i]);
        }
        Console.WriteLine($"Sample colors from render target: {string.Join(", ", sampleColors.Select(c => $"({c.R},{c.G},{c.B},{c.A})"))}");
        
        for (int y = 0; y < renderTarget.Height; y++)
        {
            for (int x = 0; x < renderTarget.Width; x++)
            {
                int index = y * renderTarget.Width + x;
                var color = data[index];
                image[x, y] = new Rgba32(color.R, color.G, color.B, color.A);
            }
        }

        return image;
    }

    ///
    /// Skeletonデータをロードします
    /// 
    public static SkeletonData LoadSkeletonData(string skeletonPath, Atlas atlas)
    {
        string extension = Path.GetExtension(skeletonPath).ToLower();
        
        if (extension == ".json")
        {
            Console.WriteLine("Using SkeletonJson to read skeleton data.");
            var json = new SkeletonJson(atlas);
            Console.WriteLine("Using SkeletonJson to complete skeleton data.");
            return json.ReadSkeletonData(skeletonPath);
        }
        else if (extension == ".skel" || extension == ".skel.bytes" || extension == ".skel.txt")
        {
            var binary = new SkeletonBinary(atlas);
            return binary.ReadSkeletonData(skeletonPath);
        }
        else
        {
            throw new ArgumentException($"Unsupported skeleton file format: {extension}");
        }
    }
}
