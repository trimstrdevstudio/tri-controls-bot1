const express = require('express');
const QRCode = require('qrcode');
const { makeWASocket, useMultiFileAuthState, Browsers, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory session storage (no file system)
const sessions = new Map();

// Utility function
function makeid(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Simple HTML for testing
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>TRI CONTROLS BOT</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial; }
        body { background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px; width: 100%; }
        .logo { background: #ff6b6b; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin: 0 auto 15px; }
        h1 { color: #333; margin-bottom: 10px; }
        .button { display: block; background: #4285f4; color: white; padding: 15px; margin: 10px 0; text-decoration: none; border-radius: 8px; font-weight: bold; }
        .button:hover { background: #3367d6; }
        .footer { margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">TRI</div>
        <h1>TRI CONTROLS BOT</h1>
        <p>WhatsApp Session Generator</p>
        
        <a href="/qr" class="button">QR CODE</a>
        <a href="/pair" class="button">PAIRING CODE</a>
        <a href="/health" class="button">HEALTH CHECK</a>
        
        <div class="footer">
            &copy; 2024 TRI MSTR DEV STUDIO | GHOSTTRI
        </div>
    </div>
</body>
</html>
    `);
});

// QR Page
app.get('/qr', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>QR Code - TRI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial; }
        body { background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px; width: 100%; }
        .logo { background: #ff6b6b; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; margin: 0 auto 15px; }
        h2 { color: #333; margin-bottom: 20px; }
        .qr-container { margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 10px; }
        #qrImage { max-width: 100%; }
        .status { margin: 15px 0; padding: 10px; border-radius: 5px; }
        .connecting { background: #fff3cd; color: #856404; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .btn { background: #4285f4; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; margin: 5px; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .home-btn { background: #666; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">TRI</div>
        <h2>QR CODE SCANNER</h2>
        
        <div class="qr-container">
            <img id="qrImage" src="" alt="QR Code">
        </div>
        
        <div id="status" class="status connecting">Click button to generate QR code</div>
        
        <button class="btn" onclick="generateQR()" id="generateBtn">Generate QR Code</button>
        <br>
        <a href="/" class="home-btn">Home</a>
    </div>

    <script>
        async function generateQR() {
            const btn = document.getElementById('generateBtn');
            const status = document.getElementById('status');
            const qrImage = document.getElementById('qrImage');

            btn.disabled = true;
            btn.textContent = 'Generating...';
            status.className = 'status connecting';
            status.textContent = 'Generating QR code...';

            try {
                const response = await fetch('/api/qr');
                if (response.ok) {
                    const blob = await response.blob();
                    qrImage.src = URL.createObjectURL(blob);
                    status.className = 'status success';
                    status.textContent = 'QR code generated! Scan with WhatsApp.';
                } else {
                    throw new Error('Failed to generate QR');
                }
            } catch (error) {
                status.className = 'status error';
                status.textContent = 'Error: ' + error.message;
            } finally {
                btn.disabled = false;
                btn.textContent = 'Generate QR Code';
            }
        }
    </script>
</body>
</html>
    `);
});

// Pair Page
app.get('/pair', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Pairing - TRI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial; }
        body { background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 15px; max-width: 400px; width: 100%; }
        .logo { background: #ff6b6b; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; margin: 0 auto 15px; }
        h2 { color: #333; text-align: center; margin-bottom: 20px; }
        .input-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; color: #333; font-weight: bold; }
        input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        .btn { background: #4285f4; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; width: 100%; margin: 10px 0; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .status { margin: 15px 0; padding: 10px; border-radius: 5px; text-align: center; }
        .connecting { background: #fff3cd; color: #856404; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .code { background: #333; color: white; padding: 15px; border-radius: 8px; margin: 15px 0; word-break: break-all; font-family: monospace; text-align: center; }
        .home-btn { background: #666; color: white; padding: 10px; text-decoration: none; border-radius: 5px; display: block; text-align: center; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">TRI</div>
        <h2>PAIRING CODE</h2>
        
        <div class="input-group">
            <label>Phone Number (with country code):</label>
            <input type="text" id="phoneNumber" placeholder="263780166288">
        </div>
        
        <button class="btn" onclick="generatePairCode()" id="generateBtn">Generate Pairing Code</button>
        
        <div id="status" class="status"></div>
        <div id="codeDisplay" class="code" style="display: none;"></div>
        
        <a href="/" class="home-btn">Home</a>
    </div>

    <script>
        async function generatePairCode() {
            const btn = document.getElementById('generateBtn');
            const status = document.getElementById('status');
            const codeDisplay = document.getElementById('codeDisplay');
            const phone = document.getElementById('phoneNumber').value;

            if (!phone) {
                status.className = 'status error';
                status.textContent = 'Please enter phone number';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Generating...';
            status.className = 'status connecting';
            status.textContent = 'Generating pairing code...';
            codeDisplay.style.display = 'none';

            try {
                const response = await fetch('/api/pair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ number: phone })
                });

                const data = await response.json();

                if (data.code) {
                    status.className = 'status success';
                    status.textContent = 'Pairing code generated!';
                    codeDisplay.textContent = 'CODE: ' + data.code;
                    codeDisplay.style.display = 'block';
                } else {
                    throw new Error(data.error || 'Failed to generate code');
                }
            } catch (error) {
                status.className = 'status error';
                status.textContent = 'Error: ' + error.message;
            } finally {
                btn.disabled = false;
                btn.textContent = 'Generate Pairing Code';
            }
        }
    </script>
</body>
</html>
    `);
});

// API Routes - Simplified for Vercel
app.get('/api/qr', async (req, res) => {
    const sessionId = makeid();
    
    try {
        // Use memory-based auth state for Vercel
        const { state, saveCreds } = await useMultiFileAuthState(sessionId);
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'error' }),
            browser: Browsers.macOS('Safari')
        });

        sessions.set(sessionId, { sock, saveCreds });

        sock.ev.on('creds.update', saveCreds);
        
        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            
            if (connection === 'open') {
                console.log('✅ TRI BOT Connected: ' + sessionId);
                
                try {
                    await sock.sendMessage(sock.user.id, {
                        text: `🚀 TRI CONTROLS BOT Connected!\\n\\nSession ID: ${sessionId}\\n\\nPowered by TRI MSTR DEV STUDIO`
                    });
                } catch (e) {
                    console.log('Message error (normal for some connections):', e.message);
                }

                // Cleanup after delay
                setTimeout(() => {
                    try {
                        sock.ws.close();
                        sessions.delete(sessionId);
                    } catch (e) {
                        console.log('Cleanup error:', e.message);
                    }
                }, 3000);
            }

            if (connection === 'close') {
                sessions.delete(sessionId);
            }
        });

        // Wait for QR code
        const qrCode = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('QR generation timeout'));
            }, 25000);

            sock.ev.on('connection.update', async (update) => {
                if (update.qr) {
                    clearTimeout(timeout);
                    try {
                        const qrBuffer = await QRCode.toBuffer(update.qr);
                        resolve(qrBuffer);
                    } catch (error) {
                        reject(error);
                    }
                }
            });
        });

        res.setHeader('Content-Type', 'image/png');
        res.send(qrCode);

    } catch (error) {
        console.log('QR API error:', error.message);
        res.status(500).json({ error: 'Failed to generate QR code: ' + error.message });
    }
});

app.post('/api/pair', async (req, res) => {
    const { number } = req.body;
    const sessionId = makeid();

    if (!number) {
        return res.status(400).json({ error: 'Phone number required' });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionId);
        
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: state.keys,
            },
            printQRInTerminal: false,
            logger: pino({ level: 'error' }),
            browser: Browsers.macOS('Safari')
        });

        sessions.set(sessionId, { sock, saveCreds });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            await delay(1000);
            const cleanNumber = number.replace(/[^0-9]/g, '');
            
            try {
                const code = await sock.requestPairingCode(cleanNumber);
                
                sock.ev.on('connection.update', async (update) => {
                    if (update.connection === 'open') {
                        console.log('✅ TRI BOT Paired: ' + sessionId);
                        
                        try {
                            await sock.sendMessage(sock.user.id, {
                                text: `🔐 TRI CONTROLS BOT Paired!\\n\\nNumber: ${number}\\nSession: ${sessionId}`
                            });
                        } catch (e) {
                            console.log('Message error:', e.message);
                        }

                        setTimeout(() => {
                            try {
                                sock.ws.close();
                                sessions.delete(sessionId);
                            } catch (e) {
                                console.log('Cleanup error:', e.message);
                            }
                        }, 3000);
                    }
                });

                return res.json({ code });
            } catch (pairError) {
                return res.status(500).json({ error: 'Pairing failed: ' + pairError.message });
            }
        }

    } catch (error) {
        console.log('Pair API error:', error.message);
        sessions.delete(sessionId);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'TRI CONTROLS BOT',
        developer: 'GHOSTTRI',
        company: 'TRI MSTR DEV STUDIO',
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
🚀 TRI CONTROLS BOT - Session Generator
📍 Port: ${PORT}
👨‍💻 Developer: GHOSTTRI
🏢 Company: TRI MSTR DEV STUDIO
✅ Server running on port ${PORT}
    `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

module.exports = app;
