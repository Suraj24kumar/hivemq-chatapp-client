# HiveMQ Chat (Client)

React frontend for the MERN chat app: Vite, Tailwind, auth with email verification, real-time messages via HiveMQ MQTT, and group chat with profile pictures.

## Setup

1. Ensure the [API server](https://github.com/your-username/hivemq-chatapp-server) is running (e.g. on port 5000).
2. Install and run:

```bash
npm install
npm run dev
```

App runs at http://localhost:5173 and proxies `/api` to the backend. Set the backend URL in `vite.config.js` if needed.

## Features

- Register, verify email (OTP), login, forgot password.
- Real-time messaging via HiveMQ MQTT over WebSocket.
- Groups and direct chats; profile and group picture uploads (Cloudinary).
- Light/dark theme toggle.
