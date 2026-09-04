const { prisma } = require('../../lib/prisma');
const { getUserIdFromRequest } = require('../../lib/auth');

module.exports = async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: 'not logged in' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(401).json({ error: 'not logged in' });
    return;
  }

  res.status(200).json({ id: user.id, email: user.email, name: user.name });
};
