const Document = require('../models/Document');
const User = require('../models/User');


// Share document with a user
exports.shareDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { email, permission } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const document = await Document.findOne({ documentId });
    if (!document) return res.status(404).json({ message: 'Document not found' });

    // Check if already shared
    const alreadyShared = document.sharedWith.find(
      (s) => s.user.toString() === user._id.toString()
    );
    if (alreadyShared) {
      alreadyShared.permission = permission; 
    } else {
      document.sharedWith.push({ user: user._id, permission });
    }

    await document.save();
    res.status(200).json({ message: 'Document shared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get shared users
exports.getSharedUsers = async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await Document.findOne({ documentId }).populate('sharedWith.user', 'email name');
    if (!document) return res.status(404).json({ message: 'Document not found' });

    res.status(200).json(document.sharedWith);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Check user permission
exports.checkPermission = async (req, res) => {
  try {
    const { documentId, userId } = req.params;
    const document = await Document.findOne({ documentId });
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const shared = document.sharedWith.find(
      (s) => s.user.toString() === userId
    );

    res.json({ permission: shared ? shared.permission : 'owner' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create document
exports.createDocument = async (req, res) => {
  try {
    const { title, documentId } = req.body;
    const doc = await Document.create({ title, documentId, owner: req.user._id });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get document by ID
exports.getDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({
      documentId: req.params.documentId,
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id }
      ]
    }).populate('sharedWith.user', 'name email');
    if (!doc) return res.status(404).json({ message: 'Document not found or access denied' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update document
exports.updateDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({
      documentId: req.params.documentId,
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id, 'sharedWith.role': 'edit' }
      ]
    });
    if (!doc) return res.status(403).json({ message: 'Access denied' });
    if (req.body.title) doc.title = req.body.title;
    if (req.body.content) doc.content = req.body.content;
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ documentId: req.params.documentId, owner: req.user._id });
    if (!doc) return res.status(403).json({ message: 'Access denied' });
    await doc.remove();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List documents accessible to user
exports.listDocuments = async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id }
      ]
    }).populate('owner', 'name email');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


