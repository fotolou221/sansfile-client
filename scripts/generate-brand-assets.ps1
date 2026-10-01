# ==============================================================================
# SansFile — Génération des variantes du logo et des icônes PWA
#
# Source unique : branding/sansfile-logo-source.png (logo bleu sur fond blanc).
# Le fond est retiré en calculant l'opacité de chaque pixel à partir de son
# écart au blanc, ce qui conserve l'anticrénelage des contours.
#
# Usage (Windows PowerShell 5.1, System.Drawing requis) :
#   powershell -ExecutionPolicy Bypass -File scripts/generate-brand-assets.ps1
# ==============================================================================

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path $root 'branding\sansfile-logo-source.png'
$images = Join-Path $root 'public\images'
$icons = Join-Path $root 'public\icons'
New-Item -ItemType Directory -Force $images, $icons | Out-Null

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class BrandKit
{
    static float[] alpha;
    static int width, height;
    public static Color Brand;

    // Charge la source et calcule la couche alpha (logo mono-couleur sur fond blanc).
    public static void Load(string path)
    {
        using (var src = new Bitmap(path))
        {
            width = src.Width; height = src.Height;
            var data = src.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var px = new byte[data.Stride * height];
            Marshal.Copy(data.Scan0, px, 0, px.Length);
            int stride = data.Stride;
            src.UnlockBits(data);

            long sr = 0, sg = 0, sb = 0, n = 0;
            for (int y = 0; y < height; y++)
                for (int x = 0; x < width; x++)
                {
                    int i = y * stride + x * 4;
                    if (px[i + 2] < 40) { sb += px[i]; sg += px[i + 1]; sr += px[i + 2]; n++; }
                }
            Brand = Color.FromArgb((int)(sr / n), (int)(sg / n), (int)(sb / n));

            const float background = 253f;
            float span = background - Brand.R;
            alpha = new float[width * height];
            for (int y = 0; y < height; y++)
                for (int x = 0; x < width; x++)
                {
                    int i = y * stride + x * 4;
                    float a = (background - px[i + 2]) / span;
                    a = (a - 0.10f) / 0.80f; // coupe le bruit du fond, rend l'intérieur plein
                    alpha[y * width + x] = a < 0 ? 0 : (a > 1 ? 1 : a);
                }
        }
    }

    // Boîte englobante du contenu entre les lignes y0 et y1, élargie de 'pad' pixels.
    public static Rectangle Bounds(int y0, int y1, int pad)
    {
        int minX = width, minY = height, maxX = -1, maxY = -1;
        for (int y = y0; y < y1; y++)
            for (int x = 0; x < width; x++)
                if (alpha[y * width + x] > 0.02f)
                {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
        var r = Rectangle.FromLTRB(minX - pad, minY - pad, maxX + 1 + pad, maxY + 1 + pad);
        r.Intersect(new Rectangle(0, 0, width, height));
        return r;
    }

    // Couche transparente d'une seule couleur découpée sur 'crop'.
    public static Bitmap Layer(Rectangle crop, Color color)
    {
        var bmp = new Bitmap(crop.Width, crop.Height, PixelFormat.Format32bppArgb);
        var data = bmp.LockBits(new Rectangle(0, 0, crop.Width, crop.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        var px = new byte[data.Stride * crop.Height];
        for (int y = 0; y < crop.Height; y++)
            for (int x = 0; x < crop.Width; x++)
            {
                int i = y * data.Stride + x * 4;
                px[i] = color.B; px[i + 1] = color.G; px[i + 2] = color.R;
                px[i + 3] = (byte)Math.Round(alpha[(crop.Y + y) * width + crop.X + x] * 255f);
            }
        Marshal.Copy(px, 0, data.Scan0, px.Length);
        bmp.UnlockBits(data);
        return bmp;
    }

    static Bitmap ResizeOnce(Bitmap src, int w, int h)
    {
        var dst = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(dst))
        using (var attrs = new ImageAttributes())
        {
            attrs.SetWrapMode(WrapMode.TileFlipXY);
            g.CompositingMode = CompositingMode.SourceCopy;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.DrawImage(src, new Rectangle(0, 0, w, h), 0, 0, src.Width, src.Height, GraphicsUnit.Pixel, attrs);
        }
        return dst;
    }

    // Réduction par paliers (÷2 max) pour garder des petites tailles nettes.
    public static Bitmap Resize(Bitmap src, int w, int h)
    {
        Bitmap current = src;
        while (current.Width / 2 >= w && current.Height / 2 >= h)
        {
            var next = ResizeOnce(current, current.Width / 2, current.Height / 2);
            if (current != src) current.Dispose();
            current = next;
        }
        var result = ResizeOnce(current, w, h);
        if (current != src) current.Dispose();
        return result;
    }

    static GraphicsPath RoundedRect(float size, float radius)
    {
        var p = new GraphicsPath();
        float d = radius * 2;
        p.AddArc(0, 0, d, d, 180, 90);
        p.AddArc(size - d, 0, d, d, 270, 90);
        p.AddArc(size - d, size - d, d, d, 0, 90);
        p.AddArc(0, size - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    // Icône carrée : couche centrée occupant au plus 'fill' de la largeur/hauteur.
    public static Bitmap Square(Bitmap layer, int size, double fill, Color background, double cornerRadius)
    {
        double scale = Math.Min(size * fill / layer.Width, size * fill / layer.Height);
        int w = Math.Max(1, (int)Math.Round(layer.Width * scale));
        int h = Math.Max(1, (int)Math.Round(layer.Height * scale));
        using (var scaled = Resize(layer, w, h))
        {
            var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.Clear(Color.Transparent);
                if (background.A > 0)
                {
                    using (var brush = new SolidBrush(background))
                    {
                        if (cornerRadius > 0)
                            using (var path = RoundedRect(size, (float)(size * cornerRadius))) g.FillPath(brush, path);
                        else
                            g.FillRectangle(brush, 0, 0, size, size);
                    }
                }
                g.CompositingMode = CompositingMode.SourceOver;
                g.DrawImage(scaled, (size - w) / 2, (size - h) / 2, w, h);
            }
            return bmp;
        }
    }

    public static void Save(Bitmap bmp, string path)
    {
        bmp.Save(path, ImageFormat.Png);
        Console.WriteLine("  " + Path.GetFileName(path) + " (" + bmp.Width + "x" + bmp.Height + ")");
    }

    // Fichier .ico contenant des images PNG (format accepté par tous les navigateurs).
    public static void SaveIco(Bitmap[] frames, string path)
    {
        var pngs = new List<byte[]>();
        foreach (var f in frames)
            using (var ms = new MemoryStream()) { f.Save(ms, ImageFormat.Png); pngs.Add(ms.ToArray()); }

        using (var bw = new BinaryWriter(File.Create(path)))
        {
            bw.Write((short)0); bw.Write((short)1); bw.Write((short)frames.Length);
            int offset = 6 + 16 * frames.Length;
            for (int i = 0; i < frames.Length; i++)
            {
                bw.Write((byte)(frames[i].Width >= 256 ? 0 : frames[i].Width));
                bw.Write((byte)(frames[i].Height >= 256 ? 0 : frames[i].Height));
                bw.Write((byte)0); bw.Write((byte)0);
                bw.Write((short)1); bw.Write((short)32);
                bw.Write(pngs[i].Length); bw.Write(offset);
                offset += pngs[i].Length;
            }
            foreach (var png in pngs) bw.Write(png);
        }
        Console.WriteLine("  " + Path.GetFileName(path) + " (" + frames.Length + " tailles)");
    }
}
"@

[BrandKit]::Load($source)
$brand = [BrandKit]::Brand
$white = [System.Drawing.Color]::White
$dark = [System.Drawing.ColorTranslator]::FromHtml('#0F172A')
$none = [System.Drawing.Color]::Transparent
Write-Host ("Bleu du logo : #{0:X2}{1:X2}{2:X2}" -f $brand.R, $brand.G, $brand.B)

# Le pictogramme (ticket) et le texte « SansFile » sont séparés par une bande vide.
$splitY = 711
$fullCrop = [BrandKit]::Bounds(0, 1254, 24)
$markCrop = [BrandKit]::Bounds(0, $splitY, 12)

Write-Host 'Logo complet (pictogramme + SansFile) :'
foreach ($v in @(@('sansfile-logo.png', $brand), @('sansfile-logo-white.png', $white), @('sansfile-logo-dark.png', $dark))) {
    $layer = [BrandKit]::Layer($fullCrop, $v[1]); [BrandKit]::Save($layer, (Join-Path $images $v[0])); $layer.Dispose()
}

Write-Host 'Pictogramme seul :'
$markBlue = [BrandKit]::Layer($markCrop, $brand)
$markWhite = [BrandKit]::Layer($markCrop, $white)
[BrandKit]::Save($markBlue, (Join-Path $icons 'sansfile-icon.png'))
[BrandKit]::Save($markWhite, (Join-Path $icons 'sansfile-icon-white.png'))

Write-Host 'Icônes PWA / iOS (pictogramme blanc sur fond bleu) :'
$appIcons = @(
    @('icon-192x192.png', 192, 0.70),
    @('icon-512x512.png', 512, 0.70),
    @('icon-maskable-512x512.png', 512, 0.56),   # zone de sécurité Android (cercle de 80 %)
    @('apple-touch-icon-180x180.png', 180, 0.66),
    @('apple-touch-icon.png', 192, 0.66)
)
foreach ($i in $appIcons) {
    $bmp = [BrandKit]::Square($markWhite, $i[1], $i[2], $brand, 0); [BrandKit]::Save($bmp, (Join-Path $icons $i[0])); $bmp.Dispose()
}

Write-Host 'Favicons (tuile bleue arrondie) :'
$favicons = @{}
foreach ($size in 16, 32, 48, 64) {
    $favicons[$size] = [BrandKit]::Square($markWhite, $size, 0.80, $brand, 0.22)
    [BrandKit]::Save($favicons[$size], (Join-Path $icons "favicon-$size.png"))
}
[BrandKit]::SaveIco(@($favicons[16], $favicons[32], $favicons[48]), (Join-Path $root 'public\favicon.ico'))
$favicons.Values | ForEach-Object { $_.Dispose() }

Write-Host 'Badge de notification Android (monochrome blanc) :'
$badge = [BrandKit]::Square($markWhite, 96, 0.90, $none, 0); [BrandKit]::Save($badge, (Join-Path $icons 'badge-96x96.png')); $badge.Dispose()

$markBlue.Dispose(); $markWhite.Dispose()
Write-Host 'Terminé.'
