const express=require ('express');
const List=require('../models/List')

const router = express.Router();

//Get all lists for a specific board
router.get('/boards/:boardId', async (req, res) => {
  try {
    const lists = await List.find({ board: req.params.boardId })
      .populate({
        path: 'tasks',
        model: 'Task', 
        populate: {
          path: 'assignedTo', 
          select: 'name email', 
        },
      })
      .sort('position');

    res.json(lists);
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({ message: 'Server error fetching lists' });
  }
});


//Create a new list in a board
router.post('/boards/:boardId', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'List name is required' });

    // Calculate position based on existing lists
    const count = await List.countDocuments({ board: req.params.boardId });

    const newList = await List.create({
      name,
      board: req.params.boardId,
      position: count,
    });

    res.status(201).json(newList);
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ message: 'Server error creating list' });
  }
});

//Update a list by Id
router.put('/:listId', async (req, res) => {
  try {
    const updatedList = await List.findByIdAndUpdate(req.params.listId, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedList) return res.status(404).json({ message: 'List not found' });
    res.json(updatedList);
  } catch (err) {
    console.error('Error updating list:', err);
    res.status(500).json({ message: 'Server error updating list' });
  }
});


//Delete a list by ID
router.delete('/:listid', async (req, res) => {
  try {
    const deletedList = await List.findByIdAndDelete(req.params.listid);
    if (!deletedList) return res.status(404).json({ message: 'List not found' });
    res.json({ message: 'List deleted successfully' });
  } catch (err) {
    console.error('Error deleting list:', err);
    res.status(500).json({ message: 'Server error deleting list' });
  }
});



module.exports = router;
