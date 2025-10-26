const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

// In-memory storage for demo purposes
let members = [];

//GET /api/members
router.get("/", (req, res) => {
  res.json(members);
});

//Add a new member
router.post("/", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  //  prevent duplicates
  if (members.find((m) => m.email === email)) {
    return res.status(400).json({ message: "Member already exists" });
  }
  const newMember = { id: uuidv4(), email };
  members.push(newMember);
  res.status(201).json(newMember);
});


// DELETE /api/members/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const index = members.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Member not found" });
  }
  const removed = members.splice(index, 1)[0];
  res.json({ message: "Member removed", id: removed.id });
});

module.exports = router;
