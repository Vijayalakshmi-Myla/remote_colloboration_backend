const { WebSocketServer } = require("ws");
const { setupWSConnection } = require("y-websocket/bin/utils.js");

function setupYWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    if (request.url.startsWith("/yjs")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        setupWSConnection(ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  console.log("🧩 Yjs WebSocket server attached to /yjs");
  return wss;
}

module.exports = { setupYWebSocketServer };
