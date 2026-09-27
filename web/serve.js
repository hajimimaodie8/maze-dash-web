/*
 * 冲撞迷阵 Maze Dash — tiny dependency-free static server for the web port.
 *
 *   node serve.js [port]
 *
 * Assets must be served over HTTP: Cocos Creator loads res/import/*.json and
 * res/raw-assets/* through XHR, which browsers block on file:// URLs.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 8099);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.plist': 'text/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.ico': 'image/x-icon',
};

function send(res, code, body, headers) {
    res.writeHead(code, Object.assign({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    }, headers || {}));
    res.end(body);
}

const VERBOSE = process.env.MAZE_LOG === '1';

const server = http.createServer((req, res) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
        return send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    if (pathname === '/' || pathname === '') { pathname = '/index.html'; }

    // A trailing slash is appended on purpose by the port's audio retry path to
    // dodge media-URL interceptors (see web-port.js); normalise it back to a file.
    if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.replace(/\/+$/, '');
    }

    // Resolve inside ROOT only (no traversal, no absolute escape).
    const target = path.resolve(ROOT, '.' + pathname);
    if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
        return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    fs.stat(target, (err, st) => {
        if (err || !st.isFile()) {
            console.log('404 ' + pathname);
            return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
        }

        const ext = path.extname(target).toLowerCase();
        const type = MIME[ext] || 'application/octet-stream';
        const total = st.size;
        const range = req.headers.range;

        if (VERBOSE) {
            console.log(`${req.method} ${pathname} bytes=${total}${range ? ' range=' + range : ''}`);
        }

        // Range support keeps <audio> seeking and some loaders happy.
        if (range) {
            const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
            if (m) {
                let start = m[1] === '' ? total - Number(m[2]) : Number(m[1]);
                let end = m[1] === '' || m[2] === '' ? total - 1 : Number(m[2]);
                if (isNaN(start) || isNaN(end) || start < 0 || end >= total || start > end) {
                    return send(res, 416, 'Range Not Satisfiable', { 'Content-Range': `bytes */${total}` });
                }
                res.writeHead(206, {
                    'Content-Type': type,
                    'Content-Range': `bytes ${start}-${end}/${total}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': end - start + 1,
                    'Cache-Control': 'no-cache',
                });
                return fs.createReadStream(target, { start, end }).pipe(res);
            }
        }

        res.writeHead(200, {
            'Content-Type': type,
            'Content-Length': total,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        if (req.method === 'HEAD') { return res.end(); }
        fs.createReadStream(target).pipe(res);
    });
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try: node serve.js 8100`);
    } else {
        console.error(err);
    }
    process.exit(1);
});

const LAN = Object.values(require('os').networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

server.listen(PORT, () => {
    console.log('');
    console.log('  冲撞迷阵 Maze Dash — 网页版已启动');
    console.log('  ------------------------------------------');
    console.log(`  本机:  http://localhost:${PORT}/`);
    LAN.forEach((ip) => console.log(`  局域网: http://${ip}:${PORT}/`));
    console.log('');
    console.log('  在浏览器中打开上面的地址即可开始游戏。');
    console.log('  按 Ctrl+C 停止服务。');
    console.log('');
});
