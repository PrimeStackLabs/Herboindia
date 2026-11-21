const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5173;
const BASE_DIR = __dirname;
const BACKEND_URL = (process.env.VITE_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:3000').trim().replace(/\/$/, '');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Dynamic /config.js injection if VITE_API_URL is supplied via process.env
  if ((pathname === '/config.js' || pathname === '/js/config.js') && process.env.VITE_API_URL) {
    const envApiUrl = process.env.VITE_API_URL.trim().replace(/\/$/, '');
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(`window.VITE_API_URL = ${JSON.stringify(envApiUrl)};\nwindow.__API_BASE__ = window.VITE_API_URL;\n`);
    return;
  }

  // Transparent reverse-proxy for API requests to backend server (Render or local port 3000)
  if (pathname.startsWith('/api/')) {
    try {
      const targetUrl = new URL(req.url, BACKEND_URL);
      const transport = targetUrl.protocol === 'https:' ? https : http;
      const proxyReq = transport.request({
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + (targetUrl.search || ''),
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host
        }
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Backend API Offline',
          message: `Could not connect to backend at ${BACKEND_URL}. Ensure your backend server is running or configure VITE_API_URL.`
        }));
      });

      req.pipe(proxyReq);
      return;
    } catch (e) {
      // Fall through to local handling
    }
  }

  // Default routes
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  } else if (pathname === '/admin') {
    pathname = '/admin.html';
  }

  const filePath = path.join(BASE_DIR, pathname);
  const resolvedPath = path.resolve(filePath);

  // Security: prevent path traversal outside BASE_DIR
  if (!resolvedPath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If not found and no extension, try adding .html
      if (!path.extname(pathname)) {
        const htmlPath = path.join(BASE_DIR, `${pathname}.html`);
        if (fs.existsSync(htmlPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(htmlPath).pipe(res);
          return;
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(resolvedPath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌿 Herbo India Frontend Client running at http://localhost:${PORT}`);
  console.log(`🔐 Doctor & Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`📡 Connected to Backend API at http://localhost:3000`);
  console.log(`=======================================================`);
});

