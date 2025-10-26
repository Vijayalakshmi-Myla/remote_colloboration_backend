const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Create new workspace
router.post('/create', authMiddleware, async (req, res) => {
  const { name } = req.body;

  const workspace = new Workspace({
    name,
    members: [req.user.id],
    pendingInvites: [],
  });

  await workspace.save();
  res.status(201).json(workspace);
});

// Join workspace by ID
router.post('/join/:workspaceId', authMiddleware, async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

  if (!workspace.members.includes(req.user.id)) {
    workspace.members.push(req.user.id);
    await workspace.save();
  }

  res.json(workspace);
});

// Get all workspaces for user
router.get('/', authMiddleware, async (req, res) => {
  const workspaces = await Workspace.find({ members: req.user.id });
  res.json(workspaces);
});

// Get specific workspace by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Invite user to workspace by email
router.post('/:workspaceId/invite', authMiddleware, async (req, res) => {
  const { workspaceId } = req.params;
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Invalid email' });
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

  //-----Only allow members to invite
  if (!workspace.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Not authorized to invite users to this workspace' });
  }

  //----- Check if user is already a member
  const invitedUser = await User.findOne({ email });
  const alreadyMember = invitedUser && workspace.members.includes(invitedUser._id);

  if (alreadyMember) {
    return res.status(400).json({ message: 'User is already a member of the workspace' });
  }

  //------ Prevent duplicate invitations
  if (workspace.pendingInvites.includes(email)) {
    return res.status(400).json({ message: 'User has already been invited' });
  }

  workspace.pendingInvites.push(email);
  await workspace.save();


  res.status(200).json({ message: `Invitation sent to ${email}` });
});

// Accept an invitation to a workspace
router.post('/:workspaceId/accept', authMiddleware, async (req, res) => {
  const { workspaceId } = req.params;

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    //----- Check if the user's email was invited
    const userEmail = req.user.email;
    if (!workspace.pendingInvites.includes(userEmail)) {
      return res.status(403).json({ message: 'You were not invited to this workspace' });
    }

    //---- Check if already a member (prevent duplicates)
    const isAlreadyMember = workspace.members.includes(req.user.id);
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'You are already a member of this workspace' });
    }

    //---- Accept invite: add to members and remove from pendingInvites
    workspace.members.push(req.user.id);
    workspace.pendingInvites = workspace.pendingInvites.filter((email) => email !== userEmail);
    await workspace.save();

    res.status(200).json({ message: 'You have joined the workspace successfully' });
  } catch (err) {
    console.error('Error accepting invitation:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Pending Invites
router.get('/:workspaceId/invites', authMiddleware, async (req, res) => {
  const { workspaceId } = req.params;

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Only members can view pending invites
    if (!workspace.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view invites for this workspace' });
    }

    res.status(200).json({ pendingInvites: workspace.pendingInvites });
  } catch (err) {
    console.error('Error fetching pending invites:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;
