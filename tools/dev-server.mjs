/**
 * Static file server used only for testing the content script against the live
 * takeUforward site. Serves the extension folder with permissive CORS so the
 * page can fetch scripts and data the way Chrome would from the extension.
 *
 *   node tools/dev-server.mjs   # http://localhost:8787
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.html': 'text/html' };

http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
    return res.end('not found');
  }
  const headers = {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*'
  };

  // Let popup.html run outside Chrome by standing in for the extension APIs.
  if (rel === 'popup/popup.html') {
    const stub = '<script>window.chrome={runtime:{getURL:p=>"/"+p},' +
      'storage:{sync:{get:(k,cb)=>cb({}),set:()=>{}},onChanged:{addListener:()=>{}}}};<\/script>';
    const html = fs.readFileSync(file, 'utf8').replace('</head>', stub + '</head>');
    res.writeHead(200, headers);
    return res.end(html);
  }

  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}).listen(8787, () => console.log('serving %s on http://localhost:8787', root));
