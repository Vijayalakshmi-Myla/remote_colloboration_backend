

const getProfile = async (req, res) => {
  try {
    const user = req.user; 
    return res.status(200).json(user);
  } catch (err) {
    console.error('Error getting profile:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports={ getProfile };
