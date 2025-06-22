# Live Captions App

A real-time speech-to-text captioning application perfect for streaming with OBS Studio. This app captures microphone input and displays live captions in a browser that can be used as a browser source in OBS.

## Features

- 🎤 Real-time speech recognition using Web Speech API
- 🌍 Multi-language support (English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese)
- 📺 OBS-ready caption display with transparent background
- 🎛️ Easy-to-use control panel
- 🔄 Real-time synchronization between control panel and caption display
- 🎨 Beautiful, modern UI with animations
- 📱 Responsive design

## Setup Instructions

### 1. Install Dependencies

Open PowerShell in the project directory and run:

```powershell
npm install
```

### 2. Start the Server

```powershell
npm start
```

Or for development with auto-restart:

```powershell
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Access the Application

- **Home Page**: `http://localhost:3000`
- **Control Panel**: `http://localhost:3000/control`
- **Captions Display**: `http://localhost:3000/captions`

## Usage

### For Streaming with OBS

1. **Start the server** by running `npm start`
2. **Open the Control Panel** at `http://localhost:3000/control`
3. **Allow microphone access** when prompted
4. **In OBS Studio**:
   - Add a new **Browser Source**
   - Set the URL to: `http://localhost:3000/captions`
   - Set Width: 1920, Height: 1080 (or your stream resolution)
   - Check "Shutdown source when not visible" and "Refresh browser when scene becomes active"
5. **Start listening** from the control panel
6. **Speak into your microphone** - captions will appear in real-time!

### Control Panel Features

- **Start/Stop Listening**: Control speech recognition
- **Language Selection**: Choose from 10 supported languages
- **Clear Captions**: Remove all current captions
- **Live Preview**: See captions as they appear

### Caption Display Features

- **Transparent background** - perfect for overlaying on streams
- **Auto-fade** - old captions automatically disappear
- **Responsive text** - adjusts to different screen sizes
- **Smooth animations** - captions slide up and fade nicely
- **Multiple lines** - supports up to 3 visible caption lines

## Browser Compatibility

This app works best with:
- ✅ Google Chrome (recommended)
- ✅ Microsoft Edge
- ✅ Safari
- ❌ Firefox (limited speech recognition support)

## Troubleshooting

### Microphone Not Working
1. Make sure to allow microphone access when prompted
2. Check your browser's microphone permissions
3. Ensure your microphone is set as the default recording device

### Captions Not Appearing
1. Check the browser console for errors
2. Make sure both control panel and captions display are connected
3. Try refreshing both pages

### OBS Integration Issues
1. Make sure the server is running
2. Check that the browser source URL is correct
3. Try refreshing the browser source in OBS

## Technical Details

- **Backend**: Node.js with Express and Socket.IO
- **Frontend**: Vanilla JavaScript with Web Speech API
- **Real-time Communication**: WebSocket connections via Socket.IO
- **Speech Recognition**: Browser's built-in Web Speech API

## Customization

You can customize the appearance by editing the CSS in the HTML files:

- **Caption styling**: Edit `public/captions.html`
- **Control panel**: Edit `public/control.html`
- **Colors, fonts, animations**: All customizable via CSS

## License

MIT License - feel free to modify and use for your streaming needs!

## Support

If you encounter any issues or have questions, check the browser console for error messages and ensure your microphone is working properly.
