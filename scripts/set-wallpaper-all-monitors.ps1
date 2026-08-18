param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ImagePath)) {
    throw "Image not found: $ImagePath"
}

$ImagePath = (Resolve-Path -LiteralPath $ImagePath).Path

Add-Type @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct WallpaperRect
{
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}

public enum DesktopWallpaperPosition
{
    Center = 0,
    Tile = 1,
    Stretch = 2,
    Fit = 3,
    Fill = 4,
    Span = 5
}

public enum DesktopSlideshowDirection
{
    Forward = 0,
    Backward = 1
}

[ComImport, Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDesktopWallpaper
{
    void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.LPWStr)] string wallpaper);
    [return: MarshalAs(UnmanagedType.LPWStr)]
    string GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitorID);
    [return: MarshalAs(UnmanagedType.LPWStr)]
    string GetMonitorDevicePathAt(uint monitorIndex);
    [return: MarshalAs(UnmanagedType.U4)]
    uint GetMonitorDevicePathCount();
    [return: MarshalAs(UnmanagedType.Struct)]
    WallpaperRect GetMonitorRECT([MarshalAs(UnmanagedType.LPWStr)] string monitorID);
    void SetBackgroundColor([MarshalAs(UnmanagedType.U4)] uint color);
    [return: MarshalAs(UnmanagedType.U4)]
    uint GetBackgroundColor();
    void SetPosition([MarshalAs(UnmanagedType.I4)] DesktopWallpaperPosition position);
    [return: MarshalAs(UnmanagedType.I4)]
    DesktopWallpaperPosition GetPosition();
    void SetSlideshow(IntPtr items);
    IntPtr GetSlideshow();
    void SetSlideshowOptions(DesktopSlideshowDirection options, uint slideshowTick);
    [PreserveSig]
    uint GetSlideshowOptions(out DesktopSlideshowDirection options, out uint slideshowTick);
    void AdvanceSlideshow([MarshalAs(UnmanagedType.LPWStr)] string monitorID, [MarshalAs(UnmanagedType.I4)] DesktopSlideshowDirection direction);
    DesktopSlideshowDirection GetStatus();
    bool Enable();
}

public static class WallpaperSetter
{
    public static int Apply(string path)
    {
        Type t = Type.GetTypeFromCLSID(new Guid("C2CF3110-460E-4FC1-B9D0-8A1C0C9CC4BD"));
        var wp = (IDesktopWallpaper)Activator.CreateInstance(t);
        uint count = wp.GetMonitorDevicePathCount();
        if (count == 0)
        {
            wp.SetWallpaper(null, path);
        }
        else
        {
            for (uint i = 0; i < count; i++)
            {
                string id = wp.GetMonitorDevicePathAt(i);
                wp.SetWallpaper(id, path);
            }
        }
        wp.SetPosition(DesktopWallpaperPosition.Fill);
        return (int)count;
    }
}
"@

$monitorCount = [WallpaperSetter]::Apply($ImagePath)
Write-Output "ok monitors=$monitorCount"
