const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const Y = require("yjs");
const { encodeStateAsUpdate, applyUpdate } = Y;
const { Binary } = require("mongodb");
const setupYWebSocketServer = require("./start-yws").setupYWebSocketServer; 

// Import routes & middleware
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");
const workspaceRoutes = require("./routes/workspaces");
const Chat = require("./models/Chat");
const listRoutes = require("./routes/listRoutes");
const taskRoutes = require("./routes/taskRoutes");
const documentRoutes = require("./routes/documentRoutes");
const memberRoutes = require("./routes/memberRoutes");

dotenv.config();

// Initialize express app
const app = express();

// Create ONE http server
const server = http.createServer(app);

// Initialize Socket.IO on same server
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [process.env.FRONTEND_URL];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/tasks", taskRoutes(io));
app.use("/api/documents", documentRoutes);
app.use("/api/members", memberRoutes);

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "Welcome to protected route", userId: req.user.id });
});

// ====== Chat Fetch ======
app.get("/api/messages/:workspaceId", authMiddleware, async (req, res) => {
  try {
    const messages = await Chat.find({
      workspaceId: req.params.workspaceId,
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ====== Mongo & Yjs State ======
let ydocsCollection = null;
const docs = new Map();

async function loadDocument(docName) {
  if (!ydocsCollection) return null;
  const docData = await ydocsCollection.findOne({ docName });
  if (docData?.snapshot) {
    const ydoc = new Y.Doc();
    applyUpdate(ydoc, docData.snapshot.buffer);
    return ydoc;
  }
  return null;
}

async function saveDocument(docName, ydoc) {
  if (!ydocsCollection) return;
  const snapshot = encodeStateAsUpdate(ydoc);
  await ydocsCollection.updateOne(
    { docName },
    { $set: { snapshot: new Binary(snapshot) } },
    { upsert: true }
  );
  console.log(`💾 Saved snapshot for doc: ${docName}`);
}

// ====== SOCKET.IO HANDLERS ======
const rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 New connection:", socket.id);

  // Chat
  socket.on("joinWorkspace", (workspaceId) => {
    socket.join(workspaceId);
    console.log(`${socket.id} joined workspace ${workspaceId}`);
  });

  socket.on("sendMessage", async (data) => {
    const { workspaceId, sender, message } = data;
    try {
      const chat = new Chat({ workspaceId, sender, message });
      await chat.save();
      io.to(workspaceId).emit("newMessage", chat);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // Yjs Document Collaboration
  socket.on("yjs-doc-join", async (docName) => {
    socket.join(docName);
    let ydoc = docs.get(docName);
    if (!ydoc) {
      ydoc = (await loadDocument(docName)) || new Y.Doc();
      docs.set(docName, ydoc);
    }
    const state = encodeStateAsUpdate(ydoc);
    socket.emit("yjs-doc-update", state);
  });

  socket.on("yjs-doc-update", async ({ docName, update }) => {
    let ydoc = docs.get(docName) || new Y.Doc();
    docs.set(docName, ydoc);
    applyUpdate(ydoc, update);
    socket.to(docName).emit("yjs-doc-update", update);
    await saveDocument(docName, ydoc);
  });

  // Video rooms
  socket.on("join-video-room", ({ roomId, userId }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, userId });
    socket.to(roomId).emit("user-joined", { socketId: socket.id, userId });
    const others = rooms[roomId].filter((u) => u.socketId !== socket.id);
    socket.emit("all-users", others);
  });

  socket.on("signal", ({ targetId, signal }) => {
    io.to(targetId).emit("signal", { from: socket.id, signal });
  });

  const leaveRoom = () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.findIndex((u) => u.socketId === socket.id);
      if (index !== -1) {
        room.splice(index, 1);
        socket.to(roomId).emit("user-left", { socketId: socket.id });
        if (room.length === 0) delete rooms[roomId];
      }
    }
  };

  socket.on("leave-video-room", leaveRoom);
  socket.on("disconnect", leaveRoom);
});

// ====== Yjs WebSocket Integration (attach to same server) ======
const wss = setupYWebSocketServer(server); // 👈 Pass the same HTTP server here

// ====== MongoDB + Start Server ======
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    ydocsCollection = mongoose.connection.collection("yjsdocuments");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Unified server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));

