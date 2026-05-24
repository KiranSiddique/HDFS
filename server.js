/**o
 * HADOOP WEBHDFS PROXY SERVER
 * ============================
 * Ye server browser aur Hadoop ke beech CORS problem fix karta hai.
 * Run karo: node server.js
 */

const http = require('http');
const url = require('url');

const PORT = 3001;
const HADOOP_HOST = 'localhost';
const HADOOP_PORT = 9870;
const HADOOP_USER = 'kiran';

function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Location');
}

function httpGet(hostname, port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

function proxyToHadoop(req, res, targetPath, bodyData) {
  return new Promise((resolve) => {
    const options = {
      hostname: HADOOP_HOST,
      port: HADOOP_PORT,
      path: targetPath,
      method: req.method,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      setCORSHeaders(res);

      // WebHDFS CREATE returns 307 redirect to DataNode
      if ((proxyRes.statusCode === 307 || proxyRes.statusCode === 301 || proxyRes.statusCode === 302) && proxyRes.headers['location']) {
        const loc = proxyRes.headers['location'];
        const redirectUrl = new URL(loc);
        const dnHost = redirectUrl.hostname === '0.0.0.0' ? '127.0.0.1' : redirectUrl.hostname;
        const dnPort = parseInt(redirectUrl.port) || 9864;
        const dnPath = redirectUrl.pathname + redirectUrl.search;

        const dnOptions = {
          hostname: dnHost,
          port: dnPort,
          path: dnPath,
          method: 'PUT',
          headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': bodyData ? bodyData.length : 0 }
        };

        const dnReq = http.request(dnOptions, (dnRes) => {
          setCORSHeaders(res);
          let dnData = '';
          dnRes.on('data', c => dnData += c);
          dnRes.on('end', () => {
            res.writeHead(dnRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: dnRes.statusCode === 201, status: dnRes.statusCode }));
            resolve();
          });
        });
        dnReq.on('error', (e) => {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
          resolve();
        });
        if (bodyData) dnReq.write(bodyData);
        dnReq.end();
        return;
      }

      let responseData = '';
      proxyRes.on('data', chunk => responseData += chunk);
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(responseData);
        resolve();
      });
    });

    proxyReq.on('error', (e) => {
      setCORSHeaders(res);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Hadoop connection failed', message: e.message }));
      resolve();
    });

    if (bodyData) proxyReq.write(bodyData);
    proxyReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname}`);

  if (req.method === 'OPTIONS') {
    setCORSHeaders(res);
    res.writeHead(200);
    res.end();
    return;
  }

  // Read request body
  let bodyData = null;
  if (req.method === 'PUT' || req.method === 'POST') {
    bodyData = await new Promise((resolve) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  try {
    // === GET /api/cluster-info ===
    if (pathname === '/api/cluster-info') {
      const result = await httpGet(HADOOP_HOST, HADOOP_PORT,
        '/jmx?qry=Hadoop:service=NameNode,name=FSNamesystemState');
      const result2 = await httpGet(HADOOP_HOST, HADOOP_PORT,
        '/jmx?qry=Hadoop:service=NameNode,name=NameNodeInfo');
      setCORSHeaders(res);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const d1 = JSON.parse(result.data);
      const d2 = JSON.parse(result2.data);
      const bean1 = d1.beans[0] || {};
      const bean2 = d2.beans[0] || {};
      res.end(JSON.stringify({
        capacity: bean1.CapacityTotal || 0,
        used: bean1.CapacityUsed || 0,
        remaining: bean1.CapacityRemaining || 0,
        liveNodes: bean1.NumLiveDataNodes || 0,
        deadNodes: bean1.NumDeadDataNodes || 0,
        totalFiles: bean1.FilesTotal || 0,
        totalBlocks: bean1.BlocksTotal || 0,
        underReplicated: bean1.UnderReplicatedBlocks || 0,
        missingBlocks: bean1.MissingBlocks || 0,
        liveNodesJson: bean2.LiveNodes || '{}',
      }));
      return;
    }

    // === GET /api/files?path=/ ===
    if (pathname === '/api/files') {
      const hdfsPath = query.path || '/';
      const target = `/webhdfs/v1${hdfsPath}?op=LISTSTATUS&user.name=${HADOOP_USER}`;
      await proxyToHadoop(req, res, target, null);
      return;
    }

    // === POST /api/mkdir?path=/user/hadoop/datasets ===
    if (pathname === '/api/mkdir') {
      const hdfsPath = query.path || '/user/hadoop/datasets';
      const target = `/webhdfs/v1${hdfsPath}?op=MKDIRS&user.name=${HADOOP_USER}`;
      await proxyToHadoop(req, res, target, null);
      return;
    }

    // === PUT /api/upload?path=/user/hadoop/datasets/file.txt&replication=1 ===
    if (pathname === '/api/upload') {
      const hdfsPath = query.path;
      const replication = query.replication || 1;
      if (!hdfsPath) {
        setCORSHeaders(res);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'path parameter required' }));
        return;
      }
      const target = `/webhdfs/v1${hdfsPath}?op=CREATE&overwrite=true&replication=${replication}&user.name=${HADOOP_USER}`;
      await proxyToHadoop(req, res, target, bodyData);
      return;
    }

    // === DELETE /api/delete?path=/user/hadoop/datasets/file.txt ===
    if (pathname === '/api/delete') {
      const hdfsPath = query.path;
      const target = `/webhdfs/v1${hdfsPath}?op=DELETE&recursive=true&user.name=${HADOOP_USER}`;
      await proxyToHadoop(req, res, target, null);
      return;
    }

    // === GET /api/fileinfo?path=... ===
    if (pathname === '/api/fileinfo') {
      const hdfsPath = query.path;
      const target = `/webhdfs/v1${hdfsPath}?op=GETFILESTATUS&user.name=${HADOOP_USER}`;
      await proxyToHadoop(req, res, target, null);
      return;
    }

    // === GET /api/mapreduce-results?path=/user/kiran/output ===
    if (pathname === '/api/mapreduce-results') {
      const hdfsPath = query.path || `/user/${HADOOP_USER}/output`;
      try {
        // Step 1: Get redirect location from NameNode
        const firstRes = await httpGet(HADOOP_HOST, HADOOP_PORT,
          `/webhdfs/v1${hdfsPath}/part-r-00000?op=OPEN&user.name=${HADOOP_USER}`);

        let rawText = '';

        if ((firstRes.status === 307 || firstRes.status === 301 || firstRes.status === 302)
            && firstRes.headers.location) {
          // Step 2: Follow redirect to DataNode
          const loc = new URL(firstRes.headers.location);
          const dnHost = loc.hostname === '0.0.0.0' ? '127.0.0.1' : loc.hostname;
          const dnPort = parseInt(loc.port) || 9864;
          const dnPath = loc.pathname + loc.search;
          const dataRes = await httpGet(dnHost, dnPort, dnPath);
          rawText = dataRes.data;
        } else if (firstRes.status === 200) {
          rawText = firstRes.data;
        } else {
          throw new Error(`Unexpected status: ${firstRes.status}`);
        }

        // Parse tab-separated word count output
        const results = [];
        rawText.split('\n').forEach(line => {
          const parts = line.split('\t');
          if (parts.length === 2 && parts[1].trim()) {
            const count = parseInt(parts[1].trim());
            if (!isNaN(count)) results.push({ word: parts[0].trim(), count });
          }
        });
        results.sort((a, b) => b.count - a.count);

        setCORSHeaders(res);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, results, total: results.length }));
      } catch (err) {
        setCORSHeaders(res);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message, results: [] }));
      }
      return;
    }

    // 404
    setCORSHeaders(res);
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Route not found' }));

  } catch (err) {
    setCORSHeaders(res);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   HADOOP WEBHDFS PROXY SERVER - RUNNING     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n  Proxy :  http://localhost:${PORT}`);
  console.log(`  Hadoop:  http://${HADOOP_HOST}:${HADOOP_PORT}`);
  console.log(`  User  :  ${HADOOP_USER}`);
  console.log('\n  Dashboard ko open karo: index2.html');
  console.log('  Ctrl+C se band karo\n');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} busy hai! Run: kill $(lsof -t -i:${PORT})\n`);
 } else {
    console.error('Server error:', e.message);
  }
  process.exit(1);
});
