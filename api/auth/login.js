const { prisma } = require('../../lib/prisma');
const { verifyPassword, createSessionToken, setSessionCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
    return;
  }

  const token = createSessionToken(user.id);
  setSessionCookie(res, token);
  res.status(200).json({ id: user.id, email: user.email, name: user.name });
};
