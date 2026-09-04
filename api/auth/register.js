const { prisma } = require('../../lib/prisma');
const { hashPassword, createSessionToken, setSessionCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined;

  if (!email || !password || password.length < 8) {
    res.status(400).json({ error: 'メールアドレスと8文字以上のパスワードを入力してください' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      ...(name ? { name } : {}),
    },
  });

  const token = createSessionToken(user.id);
  setSessionCookie(res, token);
  res.status(200).json({ id: user.id, email: user.email, name: user.name });
};
