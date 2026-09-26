$urls = @(
    "http://localhost:3000/index.html",
    "http://localhost:3000/style.css",
    "http://localhost:3000/script.js",
    "http://localhost:3000/projects-data.js",
    "http://localhost:3000/frames/Portrait_head_rotation_animation_20260924213046_000.jpg",
    "http://localhost:3000/assets/covers/shefaa-clinic.jpg",
    "http://localhost:3000/assets/covers/high-level-center.jpg",
    "http://localhost:3000/assets/projects/shefaa-clinics/17.png"
)

foreach ($u in $urls) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-WebRequest -Uri $u -UseBasicParsing
    $sw.Stop()
    $len = $res.RawContentLength
    if ($len -le 0 -and $res.Content) { $len = $res.Content.Length }
    "{0} | Status: {1} | Size: {2:N1} KB | Time: {3} ms" -f $u.Replace("http://localhost:3000/", "/"), $res.StatusCode, ($len / 1KB), $sw.ElapsedMilliseconds
}
