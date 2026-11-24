import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'http://localhost:5000/cinematic_studio.html';
const RENDER_DURATION_SECONDS = 26; // Complete continuous 3D multi-scene cycle

const PUBLIC_VIDEO_DIR = path.resolve(__dirname, '../public/assets/videos');
const DIST_VIDEO_DIR = path.resolve(__dirname, '../dist/assets/videos');

if (!fs.existsSync(PUBLIC_VIDEO_DIR)) fs.mkdirSync(PUBLIC_VIDEO_DIR, { recursive: true });
if (!fs.existsSync(DIST_VIDEO_DIR)) fs.mkdirSync(DIST_VIDEO_DIR, { recursive: true });

const OUTPUT_FILENAME = 'SacredFriends-Cinematic-3D-Motion.webm';
const PUBLIC_OUTPUT_PATH = path.join(PUBLIC_VIDEO_DIR, OUTPUT_FILENAME);
const DIST_OUTPUT_PATH = path.join(DIST_VIDEO_DIR, OUTPUT_FILENAME);

console.log('🎬 Initializing Sacred Friends 16:9 Cinematic Video Renderer...\n');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renderVideo() {
  const port = 9222;
  const chromeArgs = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu-sandbox',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--window-size=1920,1080',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    TARGET_URL
  ];

  console.log(`[Chrome] Launching Chrome in headless 1920x1080 mode...`);
  const chromeProcess = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(600);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((item) => item.type === 'page' && item.url.includes('cinematic_studio'));
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (e) {
      // Chrome starting up
    }
  }

  if (!wsUrl) {
    chromeProcess.kill();
    throw new Error('Could not obtain Chrome DevTools WebSocket URL.');
  }

  console.log(`[Chrome] Connected to DevTools debugger: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params?.args?.map(a => a.value || a.description || '').join(' ');
      console.log(`[Browser Console] ${text}`);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error(`[Browser Error]`, data.params?.exceptionDetails?.text, data.params?.exceptionDetails?.exception?.description);
    }
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  await sendCommand('Log.enable');

  console.log(`[Studio] Waiting 2.5s for character assets to preload in canvas...`);
  await sleep(2500);

  console.log(`[Studio] Starting 16:9 60 FPS recording for ${RENDER_DURATION_SECONDS} seconds...`);
  const evalStart = await sendCommand('Runtime.evaluate', {
    expression: `window.__isHeadless = true; window.startHeadlessRender(${RENDER_DURATION_SECONDS});`
  });
  if (evalStart.exceptionDetails) {
    console.error('[Studio Error starting render]:', evalStart.exceptionDetails);
  }

  // Poll for completion
  let base64Result = null;
  const startTime = Date.now();
  const maxWaitMs = (RENDER_DURATION_SECONDS + 20) * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    await sleep(1000);
    const evalRes = await sendCommand('Runtime.evaluate', {
      expression: `({ progress: window.__renderProgress || 0, hasData: !!window.__recordedVideoBase64, dataLength: window.__recordedVideoBase64 ? window.__recordedVideoBase64.length : 0 })`,
      returnByValue: true
    });

    const status = evalRes.result?.value;
    if (status) {
      process.stdout.write(`\r🎥 Rendering: ${Math.round(status.progress * 100)}% complete...`);
      if (status.hasData) {
        console.log('\n[Studio] Extraction ready! Retrieving encoded video buffer...');
        const fullEval = await sendCommand('Runtime.evaluate', {
          expression: `window.__recordedVideoBase64`,
          returnByValue: true
        });
        base64Result = fullEval.result?.value;
        break;
      }
    }
  }

  // Cleanup Chrome
  ws.close();
  chromeProcess.kill();

  if (!base64Result) {
    throw new Error('Video rendering timed out without producing data.');
  }

  const buffer = Buffer.from(base64Result, 'base64');
  fs.writeFileSync(PUBLIC_OUTPUT_PATH, buffer);
  fs.writeFileSync(DIST_OUTPUT_PATH, buffer);

  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 SUCCESS: 16:9 Cinematic Video Generated!`);
  console.log(`📁 Saved to: ${PUBLIC_OUTPUT_PATH}`);
  console.log(`📁 Saved to: ${DIST_OUTPUT_PATH}`);
  console.log(`📊 Size: ${sizeMB} MB | Format: WebM (VP9 60 FPS 1080p 16:9)`);
  console.log(`🌐 Public URL: /assets/videos/${OUTPUT_FILENAME}`);
}

renderVideo().catch((err) => {
  console.error('\n❌ Rendering failed:', err.message);
  process.exitCode = 1;
});
