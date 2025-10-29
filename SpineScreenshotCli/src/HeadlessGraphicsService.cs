using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using System;

namespace SpineScreenshotCli;

/// <summary>
/// Provides a headless GraphicsDevice for off-screen rendering.
/// </summary>
public class HeadlessGraphicsService : IDisposable
{
    public Game Game { get; private set; }
    public GraphicsDevice GraphicsDevice { get; private set; }
    public GraphicsDeviceManager GraphicsDeviceManager { get; private set; }

    private bool disposed = false;

    public HeadlessGraphicsService(int width, int height)
    {
        Game = new HeadlessGame();
        GraphicsDeviceManager = Game.Services.GetService(typeof(IGraphicsDeviceManager)) as GraphicsDeviceManager;
        
        if (GraphicsDeviceManager == null)
        {
            GraphicsDeviceManager = new GraphicsDeviceManager(Game);
        }
        
        // Configure for headless rendering
        GraphicsDeviceManager.GraphicsProfile = GraphicsProfile.Reach;
        GraphicsDeviceManager.PreferredBackBufferWidth = width;
        GraphicsDeviceManager.PreferredBackBufferHeight = height;
        
        // Initialize the game to create graphics device
        Game.RunOneFrame();
        
        GraphicsDevice = GraphicsDeviceManager.GraphicsDevice;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed && disposing)
        {
            GraphicsDeviceManager?.Dispose();
            Game?.Dispose();
            disposed = true;
        }
    }

    private class HeadlessGame : Game
    {
        private GraphicsDeviceManager? graphics;

        public HeadlessGame()
        {
            graphics = new GraphicsDeviceManager(this);
        }

        protected override void LoadContent() { }
        protected override void Update(GameTime gameTime) { }
        protected override void Draw(GameTime gameTime) { }
    }
}