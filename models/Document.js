const mongoose = require('mongoose');

const SharedUserSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['view', 'edit'], default: 'view' },
});

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    documentId: { type: String, required: true, unique: true },
    content: { type: Buffer, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [SharedUserSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);
