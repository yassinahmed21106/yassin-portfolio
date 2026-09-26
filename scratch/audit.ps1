Add-Type -AssemblyName System.Drawing

Write-Host "=== LARGEST IMAGES IN PROJECTS ==="
Get-ChildItem -Path "assets/projects" -Recurse -File | Where-Object { $_.Extension -match 'png|jpg|jpeg' } | Sort-Object Length -Descending | Select-Object -First 20 | ForEach-Object {
    try {
        $img = [System.Drawing.Image]::FromFile($_.FullName)
        $w = $img.Width
        $h = $img.Height
        $img.Dispose()
        "{0} | {1}x{2} | {3:N2} MB" -f $_.FullName.Replace((Get-Location).Path + "\", ""), $w, $h, ($_.Length / 1MB)
    } catch {
        "{0} | ERROR | {1:N2} MB" -f $_.FullName.Replace((Get-Location).Path + "\", ""), ($_.Length / 1MB)
    }
}

Write-Host "`n=== COVERS ==="
Get-ChildItem -Path "assets/covers" -File | ForEach-Object {
    try {
        $img = [System.Drawing.Image]::FromFile($_.FullName)
        $w = $img.Width
        $h = $img.Height
        $img.Dispose()
        "{0} | {1}x{2} | {3:N2} KB" -f $_.Name, $w, $h, ($_.Length / 1KB)
    } catch {
        "{0} | ERROR | {1:N2} KB" -f $_.Name, ($_.Length / 1KB)
    }
}

Write-Host "`n=== FRAMES SIZES ==="
$jpgFrames = Get-ChildItem -Path "frames" -Filter "*.jpg"
$pngFrames = Get-ChildItem -Path "frames" -Filter "*.png"
$jpgTotal = ($jpgFrames | Measure-Object -Property Length -Sum).Sum / 1MB
$pngTotal = ($pngFrames | Measure-Object -Property Length -Sum).Sum / 1MB
"Total JPG frames ({0}): {1:N2} MB" -f $jpgFrames.Count, $jpgTotal
"Total PNG frames ({0}): {1:N2} MB" -f $pngFrames.Count, $pngTotal
if ($jpgFrames.Count -gt 0) {
    $sample = [System.Drawing.Image]::FromFile($jpgFrames[0].FullName)
    "Sample JPG Frame dimensions: {0}x{1}" -f $sample.Width, $sample.Height
    $sample.Dispose()
}
