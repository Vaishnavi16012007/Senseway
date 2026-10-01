import http from 'http';
import { exec } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const child = exec(`"${edgePath}" --headless=new --remote-debugging-port=9224 --window-size=390,844 http://127.0.0.1:4173/login`);

setTimeout(() => {
  http.get('http://127.0.0.1:9224/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      try {
        const tabs = JSON.parse(data);
        const wsUrl = tabs[0].webSocketDebuggerUrl;
        const ws = new WebSocket(wsUrl);
        ws.addEventListener('open', () => {
          ws.send(JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
              returnByValue: true,
              expression: `
                JSON.stringify({
                  innerWidth: window.innerWidth,
                  scrollWidth: document.documentElement.scrollWidth,
                  elements: Array.from(document.querySelectorAll('*'))
                    .filter(el => el.scrollWidth > 390 || el.offsetWidth > 390)
                    .map(el => ({
                      tag: el.tagName,
                      class: el.className,
                      scrollWidth: el.scrollWidth,
                      offsetWidth: el.offsetWidth,
                      clientWidth: el.clientWidth
                    }))
                })
              `
            }
          }));
        });
        ws.addEventListener('message', (event) => {
          const res = JSON.parse(event.data);
          if (res.id === 1) {
            console.log('RESULT:', res.result.result.value);
            ws.close();
            child.kill();
            process.exit(0);
          }
        });
      } catch (err) {
        console.error(err);
        child.kill();
      }
    });
  }).on('error', (e) => {
    console.error('Error connecting:', e.message);
    child.kill();
  });
}, 2500);
