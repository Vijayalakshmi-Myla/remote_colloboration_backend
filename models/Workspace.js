const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  pendingInvites: [String],
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
