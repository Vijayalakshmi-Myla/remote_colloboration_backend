const express = require("express");
const Task = require("../models/Task");

module.exports = function (io) {
  const router = express.Router();

  // Create a task
  router.post("/:listId", async (req, res) => {
    const { listId } = req.params;
    console.log(' Full body received:', req.body); 

    const { content, status, assignedTo } = req.body;

    console.log('📝 New Task Received:', { content, status, assignedTo });

    try {
      const max = await Task.find({ list: listId }).sort("-position").limit(1);
      const position = max.length ? max[0].position + 1 : 0;

      const task = await Task.create({
        list: listId,
        content,
        status,
        assignedTo,
        position,
      });
      io.to(listId).emit("taskCreated", {
        ...task.toObject(),
        list: listId.toString(),
        assignedTo: assignedTo || "",
        status: status || "todo",
      });
      res.status(201).json({
      ...task.toObject(),
      list: listId.toString(),
      assignedTo: assignedTo || "",
      status: status || "todo",
    });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update a task
  router.put("/:taskId", async (req, res) => {
    const { taskId } = req.params;
    const updates = req.body;
    try {
      const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });
      if (!task) return res.status(404).json({ error: "Task not found" });

      io.to(task.list.toString()).emit("taskUpdated", task); // ✅ works now
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a task
  router.delete("/:taskId", async (req, res) => {
    const { taskId } = req.params;
    try {
      const task = await Task.findByIdAndDelete(taskId);
      if (task) {
        io.to(task.list.toString()).emit("taskDeleted", task._id); // optional
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
