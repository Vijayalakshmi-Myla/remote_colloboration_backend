const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  content: { type: String, required: true },
  position: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo',
  },
  assignedTo: {
    type: String, 
    default: null,
  },
 
}, { timestamps: true });

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);