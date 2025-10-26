const express = require('express');
const { 
  createDocument, getDocument, updateDocument, deleteDocument, listDocuments, shareDocument,getSharedUsers,
  checkPermission 
} = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createDocument);
router.get('/', listDocuments); 
router.get('/:documentId', getDocument);
router.put('/:documentId', updateDocument);
router.delete('/:documentId', deleteDocument);

//sharing routes
router.post('/:documentId/share', shareDocument);
router.get('/:documentId/shared-users', getSharedUsers);
router.get('/:documentId/permission/:userId', checkPermission);


module.exports = router;
