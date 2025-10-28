using CommandLine;
using CommandLine.Text;
using SpineScreenshotCli;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using System;
using System.Collections.Generic;

class Program
{
    static void Main(string[] args)
    {
        Parser.Default.ParseArguments<Options>(args)
            .WithParsed<Options>(opts => {
                RunWithOptions(opts);
            })
            .WithNotParsed<Options>(errs => HandleParseError(errs));
    }

    static void RunWithOptions(Options options)
    {
        Global.isNew = true;
        try
        {
            var privateImpl = false;
            if (options.ShowInfo)
            {
                var info = SpineFileInfo.Load(options);
                info.Show();
            }
            else if(privateImpl)
            {
                var renderer = new SpineRenderer_3_6(options);
                renderer.Render();
            } else
            {
                Global.Initialize(options);
                var player = new Spine_3_8.SpinePlayer_3_8();
                player.Initialize();
                player.LoadContent(options);
                player.Render(options);
                
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            Environment.Exit(1);
        }
    }

    static void HandleParseError(IEnumerable<Error> errors)
    {
        foreach (var error in errors)
        {
            Console.Error.WriteLine(error);
        }
        Environment.Exit(1);
    }
}
