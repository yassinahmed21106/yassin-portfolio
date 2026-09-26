Add-Type -AssemblyName System.Drawing

function Test-HasTransparency([string]$path) {
    $bmp = New-Object System.Drawing.Bitmap $path
    $rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $bytes = [Math]::Abs($data.Stride) * $bmp.Height
    $rgbValues = New-Object byte[] $bytes
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $rgbValues, 0, $bytes)
    $bmp.UnlockBits($data)
    $bmp.Dispose()
    
    # Check alpha channel (every 4th byte, index 3, 7, 11...)
    $hasTrans = $false
    for ($i = 3; $i -lt $rgbValues.Length; $i += 4) {
        if ($rgbValues[$i] -lt 255) {
            $hasTrans = $true
            break
        }
    }
    return $hasTrans
}

Write-Host "Shefaa 1:" (Test-HasTransparency (Resolve-Path "assets/projects/shefaa-clinics/1.png"))
Write-Host "Shefaa 17:" (Test-HasTransparency (Resolve-Path "assets/projects/shefaa-clinics/17.png"))
Write-Host "Meow Woof 4:" (Test-HasTransparency (Resolve-Path "assets/projects/meow-woof/4.png"))
