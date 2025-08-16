const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const app = express();

// Create HTTP server (Render will handle HTTPS automatically)
const server = http.createServer(app);
const io = socketIo(server, {
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

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  // Find the local IP address for local development
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }
  
  console.log(`🚀 Live Captions Server running on port ${PORT}`);
  
  if (process.env.RENDER) {
    // Running on Render - HTTPS is automatic
    console.log(`📱 Production URLs (HTTPS automatically provided by Render):`);
    console.log(`  Control Panel: https://your-app.onrender.com/control`);
    console.log(`  Captions Display: https://your-app.onrender.com/captions`);
    console.log(`  Interim Captions: https://your-app.onrender.com/interim-captions`);
  } else {
    // Local development
    console.log(`� Local Development URLs:`);
    console.log(`  Local Access: http://localhost:${PORT}`);
    console.log(`  Network Access: http://${localIP}:${PORT}`);
    console.log(`  Control Panel: http://${localIP}:${PORT}/control`);
    console.log(`  Captions Display: http://${localIP}:${PORT}/captions`);
    console.log(`  Interim Captions: http://${localIP}:${PORT}/interim-captions`);
    console.log(`\n⚠️  Note: For microphone access from remote devices, use HTTPS or deploy to Render`);
  }
});
