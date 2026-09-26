Add-Type -AssemblyName System.Drawing

function Optimize-ProjectImages([string]$targetDir, [int]$maxDim = 2560, [bool]$dryRun = $false) {
    $files = Get-ChildItem -Path $targetDir -Recurse -File | Where-Object { $_.Extension -match '^\.(png|jpg|jpeg)$' }
    $totalSaved = 0
    $count = 0

    foreach ($file in $files) {
        try {
            $img = [System.Drawing.Image]::FromFile($file.FullName)
            $origW = $img.Width
            $origH = $img.Height
            $origLen = $file.Length
            $origFormat = $file.Extension.ToLowerInvariant()
            $hasAlpha = [System.Drawing.Image]::IsAlphaPixelFormat($img.PixelFormat)

            # Check if resize is needed
            if ($origW -gt $maxDim -or $origH -gt $maxDim -or ($origLen -gt 5MB -and $origFormat -eq ".png")) {
                $scale = [math]::Min(1.0, [math]::Min($maxDim / $origW, $maxDim / $origH))
                $newW = [int]($origW * $scale)
                $newH = [int]($origH * $scale)

                if ($dryRun) {
                    Write-Host "Would optimize: $($file.Name) ($origW x $origH -> $newW x $newH), $([math]::Round($origLen/1MB, 2)) MB"
                    $img.Dispose()
                    continue
                }

                $bmp = New-Object System.Drawing.Bitmap $newW, $newH
                $g = [System.Drawing.Graphics]::FromImage($bmp)
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

                $g.DrawImage($img, 0, 0, $newW, $newH)
                $img.Dispose()
                $g.Dispose()

                $tempOut = [System.IO.Path]::GetTempFileName()

                if ($origFormat -eq ".png") {
                    $bmp.Save($tempOut, [System.Drawing.Imaging.ImageFormat]::Png)
                } else {
                    $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
                    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
                    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]92)
                    $bmp.Save($tempOut, $jpegEncoder, $encoderParams)
                }
                $bmp.Dispose()

                $newLen = (Get-Item $tempOut).Length
                if ($newLen -lt $origLen) {
                    Move-Item -Path $tempOut -Destination $file.FullName -Force
                    $saved = $origLen - $newLen
                    $totalSaved += $saved
                    $count++
                    Write-Host "Optimized: $($file.FullName.Replace((Get-Location).Path + '\', '')) ($origW x $origH -> $newW x $newH) saved $([math]::Round($saved/1MB, 2)) MB (now $([math]::Round($newLen/1MB, 2)) MB)"
                } else {
                    Remove-Item -Path $tempOut -Force
                }
            } else {
                $img.Dispose()
            }
        } catch {
            Write-Warning "Failed on $($file.FullName): $_"
        }
    }
    Write-Host "Finished. Optimized $count files. Total saved: $([math]::Round($totalSaved/1MB, 2)) MB"
}

# Run optimization
Optimize-ProjectImages -targetDir "assets/projects" -maxDim 2560 -dryRun $false
