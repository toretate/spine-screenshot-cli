using CommandLine;

namespace SpineScreenshotCli;

public class Options
{
    [Option('a', "atlas", Required = true, HelpText = "Path to the Atlas file (.atlas)")]
    public string? AtlasPath { get; set; }

    [Option('s', "skel", Required = false, HelpText = "Path to the Skeleton file (.skel or .json)")]
    public string? SkeletonPath { get; set; }

    [Option("skin", Required = false, HelpText = "Skin name to render")]
    public string? Skin { get; set; }

    [Option("animation", Required = false, HelpText = "Animation name to render (use 'all' to render all animations)")]
    public string? Animation { get; set; }

    [Option("fps", Required = false, Default = 30.0f, HelpText = "Frame rate (deafult 30)")]
    public float Fps { get; set; }

    [Option("frame", Required = false, Default = 0, HelpText = "Frame number to capture (1-based)")]
    public int Frame { get; set; }

    [Option("range", Required = false, Default = 0, HelpText = "Animation range from frame")]
    public int Range { get; set; }

    [Option("interval", Required = false, Default = 1, HelpText = "Animation capture interval")]
    public int Interval { get; set; }

    [Option("position", Required = false, HelpText = "Position as 'x,y' (default: center)")]
    public string? Position { get; set; }

    [Option("size", Required = false, Default = "512,512", HelpText = "Output size as 'width,height'")]
    public string Size { get; set; } = "512,512";

    [Option("scale", Required = false, Default = 1.0f, HelpText = "Scale factor")]
    public float Scale { get; set; }

    [Option("out-dir", Required = false, HelpText = "Output directory (default: ./out)")]
    public string OutputDir { get; set; } = "./out";

    [Option('o', "out", Required = false, HelpText = "Output filename (if not specified, auto-generated)")]
    public string? OutputFileName { get; set; }

    [Option("info", Required = false, HelpText = "Show file information only (no rendering)")]
    public bool ShowInfo { get; set; }

    [Option("premultiplied-alpha", Required = false, Default = false, HelpText = "Use premultiplied alpha blending (default: false)")]
    public bool PremultipliedAlpha { get; set; } = false;

    [Option("use-alpha", Required = false, Default = false, HelpText = "Enable alpha channel processing (SpineUseAlpha, default: false)")]
    public bool UseAlpha { get; set; } = false;

    [Option("background", Required = false, HelpText = "Background color in RRGGBB format (default: transparent)")]
    public string? BackgroundColor { get; set; }

    [Option("format", Required = false, Default = "png", HelpText = "Output format: png or webp (default: png)")]
    public string Format { get; set; } = "png";
}