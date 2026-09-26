Add-Type -AssemblyName System.Drawing

Get-ChildItem -Path "assets/projects" -Recurse -Filter "*.png" | Where-Object { $_.Length -gt 5MB } | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    $hasAlpha = [System.Drawing.Image]::IsAlphaPixelFormat($img.PixelFormat)
    $rel = $_.FullName.Replace((Get-Location).Path + "\", "")
    Write-Host "$rel | Format: $($img.PixelFormat) | AlphaPixel: $hasAlpha | Size: $([math]::Round($_.Length / 1MB, 2)) MB"
    $img.Dispose()
}
