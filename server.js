const express = require('express');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');

const app = express();

// Try to load SSL certificates
let httpsOptions = null;
try {
    httpsOptions = {
        key: fsSync.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
        cert: fsSync.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
    };
    console.log('✅ SSL certificates loaded successfully');
} catch (err) {
    console.log('⚠️  SSL certificates not found, HTTPS will not be available');
}

// Create HTTP server
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]  }
});

// Session management
let currentSessionFile = null;
let sessionStartTime = null;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/captions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'captions.html'));
});

app.get('/interim-captions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'interim-captions.html'));
});

app.get('/control', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'control.html'));
});

// Session management functions
async function startSession() {
  if (currentSessionFile) {
    console.log('Session already active');
    return currentSessionFile;
  }

  const timestamp = new Date();
  const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  const filename = `caption-session-${dateStr}-${timeStr}.txt`;
  const filepath = path.join(__dirname, 'sessions', filename);

  // Create sessions directory if it doesn't exist
  const sessionsDir = path.join(__dirname, 'sessions');
  try {
    await fs.mkdir(sessionsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating sessions directory:', error);
  }

  // Create session file with header
  const header = `Live Captions Session Log
Started: ${timestamp.toLocaleString()}
=====================================

`;

  try {
    await fs.writeFile(filepath, header, 'utf8');
    currentSessionFile = filepath;
    sessionStartTime = timestamp;
    console.log(`Session started: ${filename}`);
    return filename;
  } catch (error) {
    console.error('Error creating session file:', error);
    throw error;
  }
}

async function stopSession() {
  if (!currentSessionFile) {
    console.log('No active session');
    return;
  }

  const endTime = new Date();
  const duration = Math.round((endTime - sessionStartTime) / 1000); // duration in seconds
  const footer = `
=====================================
Session ended: ${endTime.toLocaleString()}
Duration: ${Math.floor(duration / 60)}m ${duration % 60}s
`;

  try {
    await fs.appendFile(currentSessionFile, footer, 'utf8');
    console.log(`Session ended: ${path.basename(currentSessionFile)}`);
    currentSessionFile = null;
    sessionStartTime = null;
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

async function logCaption(captionData) {
  if (!currentSessionFile || !captionData.isFinal) {
    return; // Only log final captions
  }

  const timestamp = new Date(captionData.timestamp);
  const timeStr = timestamp.toLocaleTimeString();
  const logEntry = `[${timeStr}] ${captionData.text}\n`;

  try {
    await fs.appendFile(currentSessionFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Error logging caption:', error);
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle session start
  socket.on('start-session', async () => {
    try {
      const filename = await startSession();
      socket.emit('session-started', { filename, success: true });
      console.log('Session start event sent to client');
    } catch (error) {
      socket.emit('session-started', { success: false, error: error.message });
    }
  });

  // Handle session stop
  socket.on('stop-session', async () => {
    try {
      await stopSession();
      socket.emit('session-stopped', { success: true });
      console.log('Session stop event sent to client');
    } catch (error) {
      socket.emit('session-stopped', { success: false, error: error.message });
    }
  });

  // Handle speech data from control panel
  socket.on('speech-data', async (data) => {
    console.log('Speech data received:', data);
    
    // Log final captions to file
    if (data.isFinal) {
      await logCaption(data);
    }
    
    // Broadcast to all connected clients (including captions display)
    io.emit('caption-update', data);
  });

  // Handle caption clear
  socket.on('clear-captions', () => {
    console.log('Clearing captions');
    io.emit('captions-cleared');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3001;

// Start HTTP server
httpServer.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  // Find the local IP address
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }
  
  console.log(`🚀 Live Captions Server running on:`);
  console.log(`  HTTP Local:    http://localhost:${PORT}`);
  console.log(`  HTTP Network:  http://${localIP}:${PORT}`);
  
  if (httpsOptions) {
    console.log(`  HTTPS Local:   https://localhost:${HTTPS_PORT}`);
    console.log(`  HTTPS Network: https://${localIP}:${HTTPS_PORT}`);
  }
  
  console.log(`\n📱 Access URLs:`);
  console.log(`  Control Panel: http://${localIP}:${PORT}/control`);
  console.log(`  Captions Display: http://${localIP}:${PORT}/captions`);
  console.log(`  Interim Captions: http://${localIP}:${PORT}/interim-captions`);
  
  if (httpsOptions) {
    console.log(`\n🔒 HTTPS URLs (for microphone access):`);
    console.log(`  Control Panel: https://${localIP}:${HTTPS_PORT}/control`);
    console.log(`  Captions Display: https://${localIP}:${HTTPS_PORT}/captions`);
    console.log(`  Interim Captions: https://${localIP}:${HTTPS_PORT}/interim-captions`);
  } else {
    console.log('\n⚠️  For microphone access from remote computers, generate SSL certificates:');
    console.log('   node generate-ssl.js');
  }
});

// Start HTTPS server if certificates are available
if (httpsOptions) {
  const httpsServer = https.createServer(httpsOptions, app);
  
  // Add Socket.IO to HTTPS server as well
  const httpsIo = socketIo(httpsServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Copy all socket event handlers to HTTPS server
  httpsIo.on('connection', (socket) => {
    console.log('User connected via HTTPS:', socket.id);

    // Start session handler
    socket.on('start-session', async () => {
      try {
        const sessionFile = await startSession();
        socket.emit('session-started', { success: true, sessionFile });
        console.log('Session started via HTTPS');
      } catch (error) {
        socket.emit('session-started', { success: false, error: error.message });
      }
    });

    // Stop session handler
    socket.on('stop-session', async () => {
      try {
        await stopSession();
        socket.emit('session-stopped', { success: true });
        console.log('Session stopped via HTTPS');
      } catch (error) {
        socket.emit('session-stopped', { success: false, error: error.message });
      }
    });

    // Handle speech data from control panel
    socket.on('speech-data', async (data) => {
      console.log('Speech data received via HTTPS:', data);
      
      // Log final captions to file
      if (data.isFinal) {
        await logCaption(data);
      }
      
      // Broadcast to all connected clients on both HTTP and HTTPS
      io.emit('caption-update', data);
      httpsIo.emit('caption-update', data);
    });

    // Handle caption clear
    socket.on('clear-captions', () => {
      console.log('Clearing captions via HTTPS');
      io.emit('captions-cleared');
      httpsIo.emit('captions-cleared');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected via HTTPS:', socket.id);
    });
  });
  
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
  });
}
