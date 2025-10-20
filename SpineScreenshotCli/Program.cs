using CommandLine;
using CommandLine.Text;
using SpineScreenshotCli;

class Program
{
    static void Main(string[] args)
    {
        // Manual detection of --use-alpha=false due to CommandLine parser bug
        bool useAlphaFromArgs = true; // Default to true unless explicitly set to false
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--use-alpha=false")
            {
                useAlphaFromArgs = false;
                break;
            }
        }

        Parser.Default.ParseArguments<Options>(args)
            .WithParsed<Options>(opts => {
                // Override UseAlpha with manual detection result
                opts.UseAlpha = useAlphaFromArgs;
                
                RunWithOptions(opts);
            })
            .WithNotParsed<Options>(errs => HandleParseError(errs));
    }

    static void RunWithOptions(Options options)
    {
        try
        {
            if (options.ShowInfo)
            {
                var info = SpineFileInfo.Load(options);
                info.Show();
            }
            else
            {
                SpineRenderer.RenderSpineScreenshot(options);
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
