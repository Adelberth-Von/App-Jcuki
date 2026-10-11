# Reproducible original vector mark. Windows System.Drawing is only used for PNG rasterization.
param([string]$AssetDirectory = (Join-Path $PSScriptRoot '..\assets'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$jcukiAssets = [System.IO.Path]::GetFullPath($AssetDirectory)
if (-not (Test-Path -LiteralPath $jcukiAssets)) { New-Item -ItemType Directory -Path $jcukiAssets | Out-Null }

function New-JCukiRoundedPath([single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    [single]$diameter = $radius * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc(($x + $width - $diameter), $y, $diameter, $diameter, 270, 90)
    $path.AddArc(($x + $width - $diameter), ($y + $height - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($x, ($y + $height - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Write-JCukiAsset([string]$name, [int]$size, [string]$background, [string]$foreground, [single]$markScale) {
    $format = if ($background) { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb } else { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb }
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, $format)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        if ($background) { $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($background)) }
        else { $graphics.Clear([System.Drawing.Color]::Transparent) }
        [single]$canvasScale = $size / 1024.0
        $graphics.TranslateTransform(($size / 2.0), ($size / 2.0))
        $graphics.ScaleTransform(($canvasScale * $markScale), ($canvasScale * $markScale))
        $graphics.RotateTransform(-35)
        $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($foreground), 54)
        $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
        $left = New-JCukiRoundedPath -285 -108 360 216 108
        $right = New-JCukiRoundedPath -75 -108 360 216 108
        try { $graphics.DrawPath($pen, $left); $graphics.DrawPath($pen, $right) }
        finally { $pen.Dispose(); $left.Dispose(); $right.Dispose() }
        $bitmap.Save((Join-Path $jcukiAssets $name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
}

Write-JCukiAsset 'icon.png' 1024 '#185F50' '#FFFFFF' 1.0
Write-JCukiAsset 'android-icon-foreground.png' 1024 '' '#FFFFFF' 0.86
Write-JCukiAsset 'android-icon-monochrome.png' 1024 '' '#FFFFFF' 0.86
Write-JCukiAsset 'splash-icon.png' 1024 '' '#185F50' 1.15
Write-JCukiAsset 'splash-icon-dark.png' 1024 '' '#8FDAB5' 1.15
Write-JCukiAsset 'notification-icon.png' 96 '' '#FFFFFF' 1.3
Write-JCukiAsset 'favicon.png' 64 '#185F50' '#FFFFFF' 1.05
Write-Output ('Generated original JCuki brand PNG assets in ' + $jcukiAssets)
