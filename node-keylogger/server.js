const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const LOG_FILE = path.join(__dirname, 'keystrokes.log');

wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress || "Unknown IP";
    console.log(`✅ Client connected from ${clientIP}`);

    ws.on('message', (message) => {
        try {
            const keyEvent = JSON.parse(message);
            keyEvent.clientIP = clientIP;

            const logEntry = {
                timeS: Math.floor(Date.now() / 1000),
                timeMS: Date.now() % 1000000,
                keyCode: keyEvent.keyCode,
                keyId: keyEvent.keyId,
                type: keyEvent.type,
                dev: "event2"
            };

            fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + "\n", (err) => {
                if (err) console.error("❌ Error writing log:", err);
            });

            console.log(logEntry);

            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify(logEntry));
                }
            });
        } catch (err) {
            console.error("❌ Error parsing WebSocket message:", err);
        }
    });

    ws.on('close', () => {
        console.log(`❌ Client disconnected from ${clientIP}`);
    });

    ws.onerror = (error) => {
        console.error(`❌ WebSocket Error:`, error);
    };
});


app.get("/", (req, res) => {
    res.render("index");
});


app.get('/keystrokes', (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send("Error reading log file");
        res.type('text').send(data);
    });
});


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
