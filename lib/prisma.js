const { PrismaClient } = require('@prisma/client');

// サーバーレス関数の再利用(ホットスタート)間でコネクションを使い回すためグローバルにキャッシュ
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = { prisma };
