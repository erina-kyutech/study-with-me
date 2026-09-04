const { prisma } = require('../lib/prisma');
const { getUserIdFromRequest } = require('../lib/auth');

module.exports = async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: 'not logged in' });
    return;
  }

  if (req.method === 'GET') {
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    const totalSec = await prisma.studySession.aggregate({
      where: { userId },
      _sum: { durationSec: true },
    });
    res.status(200).json({
      sessions,
      totalSec: totalSec._sum.durationSec || 0,
    });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const startedAt = new Date(body.startedAt);
    const endedAt = new Date(body.endedAt);
    const durationSec = Number(body.durationSec);

    if (
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime()) ||
      !Number.isFinite(durationSec) ||
      durationSec <= 0
    ) {
      res.status(400).json({ error: 'invalid session data' });
      return;
    }

    const session = await prisma.studySession.create({
      data: { userId, startedAt, endedAt, durationSec: Math.round(durationSec) },
    });
    res.status(200).json(session);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
