using Microsoft.Xna.Framework.Graphics;
using Spine;
using System;
using System.IO;
using System.Linq;

namespace SpineScreenshotCli;

public class SpineFileInfo
{
    public readonly String AtlasPath;
    public readonly String SkeletonPath;
    public readonly ExposedList<Skin> skins;
    public readonly ExposedList<Animation> animations;
    public readonly int bones;
    public readonly int slots;

    private SpineFileInfo(
        String atlasPath,
        String skeletonPath,
        ExposedList<Skin> skins,
        ExposedList<Animation> animations,
        int bones,
        int slots
    ) {
        this.AtlasPath = atlasPath;
        this.SkeletonPath = skeletonPath;
        this.skins = skins;
        this.animations = animations;
        this.bones = bones;
        this.slots = slots;
    }

    public static SpineFileInfo Load( Options options ) {
        Console.WriteLine("Loading Spine file information...");
        SpineFileInfo info = null;

        if (string.IsNullOrEmpty(options.AtlasPath) || !File.Exists(options.AtlasPath))
        {
            Console.WriteLine("Error: Atlas file not found.: ${options.AtlasPath}");
            return null;
        }
        Console.WriteLine($"Atlas Path: {options.AtlasPath}");

        // Create a dummy graphics service just for loading
        using ( var graphicsService = new HeadlessGraphicsService(256, 256) ) {
            var atlas = null as Atlas;
            try {
                atlas = new Atlas(options.AtlasPath, new MonoGameTextureLoader(graphicsService.GraphicsDevice));
                if (!string.IsNullOrEmpty(options.SkeletonPath) && File.Exists(options.SkeletonPath))
                {
                    Console.WriteLine($"Skeleton Path: {options.SkeletonPath}");
                    var skeletonData = SpineData.LoadSkeletonData(options.SkeletonPath, atlas);
                    info = new SpineFileInfo(
                        options.AtlasPath,
                        options.SkeletonPath,
                        skeletonData.Skins,
                        skeletonData.Animations,
                        skeletonData.Bones.Count,
                        skeletonData.Slots.Count
                    );
                }
            } finally {
                atlas?.Dispose();
            }
        }

        return info;
    }

    public void Show() {
        Console.WriteLine("Spine File Information:");
        Console.WriteLine($"Atlas: {this.AtlasPath}");
        Console.WriteLine($"Skeleton: {this.SkeletonPath}");
        Console.WriteLine($"Skins: {string.Join(", ", this.skins.Select(s => s.Name))}");
        Console.WriteLine($"Animations: {string.Join(", ", this.animations.Select(a => a.Name))}");
        foreach (var anim in this.animations) {
            Console.WriteLine($"  Animation '{anim.Name}': Duration = {anim.Duration} seconds");
        }


        Console.WriteLine($"Bones: {this.bones}");
        Console.WriteLine($"Slots: {this.slots}");
    }
}