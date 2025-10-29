using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using System.IO;

namespace SpineScreenshotCli;

public class Global
{
    public static bool isNew = true;

    public static RenderingInfo Info { get; set; }

    public static SpineFileInfo SpineInfo { get; set; }

    public static HeadlessGraphicsService GraphicsService;
    public static GraphicsDevice GraphicsDevice;
    public static SpriteBatch SpriteBatch;

    public static string[] multiTexture = null;

    public static int TimeScale = 1;
    public static int Scale = 1;

    // 背景関係
    public static bool UseBG { get; set; } = false;
    public static Texture2D? BGTexture { get; set; } = null;
    public static int PosBGX { get; set; } = 0;
    public static int PosBGY { get; set; } = 0;
    public static int SizeBGWidth { get; set; } = 0;
    public static int SizeBGHeight { get; set; } = 0;

    public static void Initialize(Options options)
    {
        Info = new RenderingInfo(options);
        SpineInfo = SpineFileInfo.Load(options);

        GraphicsService = new HeadlessGraphicsService(Info.Width, Info.Height);
        GraphicsDevice = GraphicsService.GraphicsDevice;
    }

    public static bool IsBinaryData(string path)
    {
        if (File.Exists(path.Replace(".atlas", ".skel")) && path.IndexOf(".skel") > -1)
            return true;
        else
            return false;
    }

    public static void SetInitLocation(float height)
    {
        // if (App.isNew)
        // {
        //     App.globalValues.PosX = Convert.ToSingle(App.globalValues.FrameWidth / 2f);
        //     App.globalValues.PosY = Convert.ToSingle((height + App.globalValues.FrameHeight) / 2f);
        // }
    }

}