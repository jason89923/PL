const express = require('express');
const app = express();
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');

const port = 3000;

// 解析 JSON 請求體
app.use(express.json());

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/OurC_program/:project', (req, res) => {
    const project = req.params.project;
    if (/^[1-4]$/.test(project)) {
        res.render('xterm', { project: project })
    } else {
        res.send('Invalid project');
    }
});

// 使用http模塊創建伺服器，並將Express應用作為請求處理器
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
    let ptyProcess = null;
    let cwd = './OurC_program';
    var exit = false;

    ws.on('message', (message) => {
        if (exit) {
            ws.close();
            return;
        }

        if (!ptyProcess) {
            // 解析收到的消息
            const data = JSON.parse(message);
            const project = data.project;
            const program_name = `OurC-Project${project}`

            // 初始化虛擬終端
            ptyProcess = pty.spawn('bash', ['-c', `java -jar ${program_name}.jar || echo "AAA"`], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: cwd,
                env: process.env
            });

            ptyProcess.write('1\n');

            ptyProcess.on('data', (data) => {
                ws.send(data);
            });

            // 監聽ptyProcess的退出事件
            ptyProcess.on('exit', () => {
                ws.send('程式已退出');
                exit = true;
            });

        } else {
            // 將客戶端消息傳遞給虛擬終端
            ptyProcess.write(message);
        }
    });

    ws.on('close', () => {
        if (ptyProcess && !exit) {
            ptyProcess.kill();
        }
    });
});

// 監聽與Express相同的端口
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});