const http = require('http');
const { exec } = require('child_process');

async function test() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const child = exec(`"${edgePath}" --headless=new --remote-debugging-port=9222 --window-size=390,844 http://127.0.0.1:4173/login`);
  
  // wait 1.5s
  await new Promise(r => setTimeout(r, 1500));
  
  // fetch /json
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      console.log('Tabs:', tabs.length);
      const wsUrl = tabs[0].webSocketDebuggerUrl;
      console.log('WS:', wsUrl);
      child.kill();
    });
  }).on('error', (e) => {
    console.error('Error connecting:', e.message);
    child.kill();
  });
}

test();
