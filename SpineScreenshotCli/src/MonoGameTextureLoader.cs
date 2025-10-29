using Microsoft.Xna.Framework.Graphics;
using Spine;
using System;
using System.IO;

namespace SpineScreenshotCli;

/// <summary>
/// MonoGame texture loader for Spine atlas pages.
/// </summary>
public class MonoGameTextureLoader : TextureLoader
{
    private GraphicsDevice graphicsDevice;

    public MonoGameTextureLoader(GraphicsDevice graphicsDevice)
    {
        this.graphicsDevice = graphicsDevice;
    }

    public void Load(AtlasPage page, string path)
    {
        try
        {
            // Load texture from file
            using var fileStream = new FileStream(path, FileMode.Open, FileAccess.Read);
            var texture = Texture2D.FromStream(graphicsDevice, fileStream);
            
            // Set the texture as the renderer object
            page.rendererObject = texture;
            page.width = texture.Width;
            page.height = texture.Height;
            
            Console.WriteLine($"Loaded texture: {path} ({texture.Width}x{texture.Height})");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to load texture {path}: {ex.Message}");
            throw;
        }
    }

    public void Unload(object texture)
    {
        if (texture is Texture2D tex)
        {
            tex.Dispose();
        }
    }
}