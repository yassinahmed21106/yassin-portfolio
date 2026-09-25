Add-Type -AssemblyName System.Drawing

function Create-Thumbnail($srcPath, $destPath, $maxWidth = 960) {
    if (-not (Test-Path $srcPath)) { Write-Host "NotFound: $srcPath"; return }
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $origW = $srcImg.Width
    $origH = $srcImg.Height
    
    if ($origW -gt $maxWidth) {
        $newW = $maxWidth
        $newH = [int][math]::Round(($origH * $maxWidth) / $origW)
    } else {
        $newW = $origW
        $newH = $origH
    }

    $destBmp = New-Object System.Drawing.Bitmap($newW, $newH)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $rect = New-Object System.Drawing.Rectangle(0, 0, $newW, $newH)
    $g.DrawImage($srcImg, $rect)

    $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 85)

    $tempDest = $destPath + ".tmp.jpg"
    $destBmp.Save($tempDest, $jpegEncoder, $encoderParams)

    $g.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()

    Move-Item -Force $tempDest $destPath

    $origKb = [math]::Round((Get-Item $srcPath).Length / 1KB, 1)
    $newKb = [math]::Round((Get-Item $destPath).Length / 1KB, 1)
    Write-Host "Created $destPath : $origKb KB -> $newKb KB ($newW x $newH)"
}

Create-Thumbnail "assets\projects\shefaa-clinics\1.png" "assets\covers\shefaa-clinic.jpg"
Create-Thumbnail "assets\projects\high-level-center\1.png" "assets\covers\high-level-center.jpg"
Create-Thumbnail "assets\projects\brave-store\1.png" "assets\covers\brave-store.jpg"
Create-Thumbnail "assets\projects\nokia\1.png" "assets\covers\nokia.jpg"
Create-Thumbnail "assets\covers\perfect-bite.png" "assets\covers\perfect-bite.jpg"
Create-Thumbnail "assets\covers\meow-woof.jpg" "assets\covers\meow-woof.jpg"
Create-Thumbnail "assets\covers\suzy-kitchen.jpg" "assets\covers\suzy-kitchen.jpg"
Create-Thumbnail "assets\covers\orvix.jpg" "assets\covers\orvix.jpg"
