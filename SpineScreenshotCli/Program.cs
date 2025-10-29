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
            if (options.ShowInfo)
            {
                var info = SpineFileInfo.Load(options);
                info.Show();
            }
#if SPINE_3_6
            var renderer = new SpineRenderer_3_6(options);
            renderer.Render();
#elif SPINE_3_8
            Global.Initialize(options);
            var player = new SpinePlayer_3_8();
            player.Initialize();
            player.LoadContent(options);
            player.Render(options);
#else
            Console.Error.WriteLine("No Spine version specified. Use -p:SpineVersion=3.6 or -p:SpineVersion=3.8");
            Environment.Exit(1);
#endif
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
