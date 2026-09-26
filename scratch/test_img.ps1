Add-Type -AssemblyName System.Drawing

$src = "assets/projects/shefaa-clinics/17.png"
$img = [System.Drawing.Image]::FromFile((Resolve-Path $src))

$maxDim = 2560
$scale = [math]::Min(1.0, [math]::Min($maxDim / $img.Width, $maxDim / $img.Height))
$newW = [int]($img.Width * $scale)
$newH = [int]($img.Height * $scale)

$bmp = New-Object System.Drawing.Bitmap $newW, $newH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($img, 0, 0, $newW, $newH)

$outPng = "scratch/test_opt_17.png"
$bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Optimized PNG: $newW x $newH, $([math]::Round((Get-Item $outPng).Length / 1MB, 2)) MB"
