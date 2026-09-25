Add-Type @"
#pragma warning disable 4014
using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

public class FastServer {
    private HttpListener _listener;
    private string _rootDir;

    public void Start(int port, string rootDir) {
        _rootDir = rootDir;
        _listener = new HttpListener();
        _listener.Prefixes.Add("http://localhost:" + port + "/");
        _listener.Start();
        Console.WriteLine("HTTP server running at http://localhost:" + port + "/");

        ThreadPool.QueueUserWorkItem(state => {
            while (_listener.IsListening) {
                try {
                    var context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ctx => HandleRequest((HttpListenerContext)ctx), context);
                } catch {
                    if (!_listener.IsListening) break;
                }
            }
        });
    }

    private void HandleRequest(HttpListenerContext context) {
        try {
            var request = context.Request;
            var response = context.Response;

            response.Headers.Add("Access-Control-Allow-Origin", "*");

            string rawUrl = Uri.UnescapeDataString(request.Url.AbsolutePath);
            if (string.IsNullOrEmpty(rawUrl) || rawUrl == "/") {
                rawUrl = "/index.html";
            }

            string relativePath = rawUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            string filePath = Path.Combine(_rootDir, relativePath);

            if (!File.Exists(filePath)) {
                string altPath = Path.Combine(_rootDir, "frames", relativePath);
                if (File.Exists(altPath)) {
                    filePath = altPath;
                }
            }

            if (File.Exists(filePath)) {
                string ext = Path.GetExtension(filePath).ToLowerInvariant();
                string mime = "application/octet-stream";
                switch (ext) {
                    case ".html": case ".htm": mime = "text/html; charset=utf-8"; break;
                    case ".css": mime = "text/css; charset=utf-8"; break;
                    case ".js": mime = "application/javascript; charset=utf-8"; break;
                    case ".jpg": case ".jpeg": mime = "image/jpeg"; break;
                    case ".png": mime = "image/png"; break;
                    case ".webp": mime = "image/webp"; break;
                    case ".mp4": mime = "video/mp4"; break;
                    case ".svg": mime = "image/svg+xml"; break;
                    case ".json": mime = "application/json"; break;
                }

                response.ContentType = mime;
                response.Headers.Add("Accept-Ranges", "bytes");

                if (ext == ".jpg" || ext == ".png" || ext == ".webp") {
                    response.Headers.Add("Cache-Control", "public, max-age=31536000, immutable");
                }

                FileInfo fi = new FileInfo(filePath);
                long totalLength = fi.Length;

                string rangeHeader = request.Headers["Range"];
                if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes=")) {
                    string[] rangeParts = rangeHeader.Substring(6).Split('-');
                    long start = 0;
                    long end = totalLength - 1;

                    if (!string.IsNullOrEmpty(rangeParts[0])) {
                        long.TryParse(rangeParts[0], out start);
                    }
                    if (rangeParts.Length > 1 && !string.IsNullOrEmpty(rangeParts[1])) {
                        long.TryParse(rangeParts[1], out end);
                    }
                    if (end >= totalLength) end = totalLength - 1;
                    if (start > end) start = 0;

                    long lengthToSend = end - start + 1;
                    response.StatusCode = 206;
                    response.Headers.Add("Content-Range", string.Format("bytes {0}-{1}/{2}", start, end, totalLength));
                    response.ContentLength64 = lengthToSend;

                    if (request.HttpMethod != "HEAD") {
                        using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                            fs.Seek(start, SeekOrigin.Begin);
                            byte[] buffer = new byte[65536];
                            long bytesRemaining = lengthToSend;
                            while (bytesRemaining > 0) {
                                int toRead = (int)Math.Min((long)buffer.Length, bytesRemaining);
                                int read = fs.Read(buffer, 0, toRead);
                                if (read <= 0) break;
                                response.OutputStream.Write(buffer, 0, read);
                                bytesRemaining -= read;
                            }
                        }
                    }
                } else {
                    response.ContentLength64 = totalLength;
                    if (request.HttpMethod != "HEAD") {
                        using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                            byte[] buffer = new byte[65536];
                            int read;
                            while ((read = fs.Read(buffer, 0, buffer.Length)) > 0) {
                                response.OutputStream.Write(buffer, 0, read);
                            }
                        }
                    }
                }
            } else {
                response.StatusCode = 404;
                byte[] notFound = System.Text.Encoding.UTF8.GetBytes("404 Not Found");
                response.OutputStream.Write(notFound, 0, notFound.Length);
            }
            response.Close();
        } catch {
            try { context.Response.Abort(); } catch {}
        }
    }
}
"@

$server = New-Object FastServer
$server.Start(3000, $PSScriptRoot)

while ($true) {
    Start-Sleep -Seconds 3600
}
