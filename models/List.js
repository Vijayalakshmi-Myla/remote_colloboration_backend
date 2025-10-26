const mongoose = require('mongoose');
const { Schema } = mongoose;

const listSchema = new Schema({
  name: String,
  position: Number,
  board: { type: Schema.Types.ObjectId, ref: 'Board' },
}, { timestamps: true });

module.exports = mongoose.model('List', listSchema);
