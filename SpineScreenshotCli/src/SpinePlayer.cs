using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using System.Windows;
using System.Windows.Input;
using System.Drawing;

namespace SpineScreenshotCli;


public class SpinePlayer
{
    public static void Initialize(
        ref GraphicsDevice graphicsDevice
        , ref SpriteBatch spriteBatch
    )
    {
        PresentationParameters pp = new PresentationParameters();
        pp.BackBufferWidth = Global.Info.Width;
        pp.BackBufferHeight = Global.Info.Height;
        Global.Info.RenderSize = new Size(pp.BackBufferWidth, pp.BackBufferHeight);
        graphicsDevice = Global.GraphicsDevice;
        graphicsDevice.PresentationParameters.BackBufferWidth = Global.Info.Width;
        graphicsDevice.PresentationParameters.BackBufferHeight = Global.Info.Height;
        spriteBatch = new SpriteBatch(graphicsDevice);
    }

    public static void DrawBG(ref SpriteBatch spriteBatch)
    {
        if (Global.UseBG && Global.BGTexture != null)
        {
            spriteBatch.Begin(SpriteSortMode.Texture, BlendState.AlphaBlend);
            spriteBatch.Draw(
                Global.BGTexture,
                // new Rectangle(Global.PosBGX, Global.PosBGY, Global.SizeBG.Width, Global.SizeBG.Height),
                new Microsoft.Xna.Framework.Rectangle(Global.PosBGX, Global.PosBGY, Global.Info.Width, Global.Info.Height),
                Microsoft.Xna.Framework.Color.White
            );
            spriteBatch.End();
            return;
        }
    }
}