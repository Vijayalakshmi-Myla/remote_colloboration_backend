const mongoose = require('mongoose');
const { Schema } = mongoose;


const BoardSchema = new Schema({
  name: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.models.Board || mongoose.model('Board', BoardSchema);