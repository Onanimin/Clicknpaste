import { nanoid } from 'nanoid';
import { Prisma } from '@prisma/client';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.join(__dirname, '..', '..', '.data');
const storePath = path.join(dataDirectory, 'pastes.json');

async function readPasteStore() {
  try {
    const raw = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writePasteStore(pastes) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storePath, `${JSON.stringify(pastes, null, 2)}\n`, 'utf8');
}

function toPasteResponse(paste) {
  return {
    ...paste,
    expiresAt: paste.expiresAt ? new Date(paste.expiresAt) : null,
    createdAt: paste.createdAt ? new Date(paste.createdAt) : new Date()
  };
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, encoded) {
  const [saltHex, hashHex] = String(encoded || '').split(':');
  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

function checkPrivateAccess(paste, password) {
  if (!paste.passwordHash) {
    return { ok: true };
  }

  if (!password) {
    return { ok: false, code: 'PASSWORD_REQUIRED' };
  }

  if (!verifyPassword(password, paste.passwordHash)) {
    return { ok: false, code: 'INVALID_PASSWORD' };
  }

  return { ok: true };
}

async function createPasteFile({ content, maxViews, password, ttlSeconds }) {
  const id = nanoid(12);
  const now = new Date();
  const expiresAt = ttlSeconds ? new Date(now.getTime() + ttlSeconds * 1000) : null;
  const pastes = await readPasteStore();

  const paste = {
    id,
    content,
    createdAt: now.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    maxViews: maxViews ?? null,
    viewCount: 0,
    passwordHash: password ? hashPassword(password) : null
  };

  pastes.push(paste);
  await writePasteStore(pastes);

  return toPasteResponse(paste);
}

async function consumePasteFile(id, currentTime, password) {
  const pastes = await readPasteStore();
  const index = pastes.findIndex((paste) => paste.id === id);

  if (index === -1) {
    return null;
  }

  const paste = pastes[index];
  const expiresAt = paste.expiresAt ? new Date(paste.expiresAt) : null;

  if (expiresAt && expiresAt <= currentTime) {
    pastes.splice(index, 1);
    await writePasteStore(pastes);
    return null;
  }

  if (paste.maxViews !== null && paste.maxViews !== undefined && paste.viewCount >= paste.maxViews) {
    pastes.splice(index, 1);
    await writePasteStore(pastes);
    return null;
  }

  const access = checkPrivateAccess(paste, password);
  if (!access.ok) {
    return { error: access.code };
  }

  paste.viewCount += 1;
  if (paste.maxViews !== null && paste.maxViews !== undefined && paste.viewCount >= paste.maxViews) {
    pastes.splice(index, 1);
  } else {
    pastes[index] = paste;
  }

  await writePasteStore(pastes);

  return { paste: toPasteResponse(paste) };
}

async function checkDatabaseConnectionFile() {
  await mkdir(dataDirectory, { recursive: true });
}

export async function createPaste({ content, maxViews, password, ttlSeconds }) {
  const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;

  if (!process.env.DATABASE_URL) {
    return createPasteFile({ content, maxViews, password, ttlSeconds });
  }

  const id = nanoid(12);

  const paste = await prisma.paste.create({
    data: {
      id,
      content,
      expiresAt,
      maxViews: maxViews ?? null,
      viewCount: 0,
      passwordHash: password ? hashPassword(password) : null
    }
  });

  return paste;
}

export async function consumePaste(id, currentTime, password) {
  if (!process.env.DATABASE_URL) {
    return consumePasteFile(id, currentTime, password);
  }

  return prisma.$transaction(async (transaction) => {
    const pasteRow = await transaction.paste.findUnique({ where: { id } });

    if (!pasteRow) {
      return { error: 'NOT_FOUND' };
    }

    if (pasteRow.expiresAt && pasteRow.expiresAt <= currentTime) {
      await transaction.paste.delete({ where: { id: pasteRow.id } });
      return { error: 'NOT_FOUND' };
    }

    if (pasteRow.maxViews !== null && pasteRow.viewCount >= pasteRow.maxViews) {
      await transaction.paste.delete({ where: { id: pasteRow.id } });
      return { error: 'NOT_FOUND' };
    }

    const access = checkPrivateAccess(pasteRow, password);
    if (!access.ok) {
      return { error: access.code };
    }

    const rows = await transaction.$queryRaw(Prisma.sql`
      UPDATE "Paste"
      SET "viewCount" = "viewCount" + 1
      WHERE "id" = ${id}
      RETURNING "id", "content", "expiresAt", "maxViews", "viewCount", "passwordHash"
    `);

    const paste = rows[0] ?? null;

    if (!paste) {
      return { error: 'NOT_FOUND' };
    }

    if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) {
      await transaction.paste.delete({ where: { id: paste.id } });
    }

    return { paste };
  });
}

export async function checkDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    await checkDatabaseConnectionFile();
    return;
  }

  await prisma.$queryRaw(Prisma.sql`SELECT 1`);
}

export async function listAvailablePastes(currentTime) {
  // Return all non-expired, non-exhausted pastes, including private ones.
  if (!process.env.DATABASE_URL) {
    const pastes = await readPasteStore();
    const filtered = pastes.filter((paste) => {
      const expiresAt = paste.expiresAt ? new Date(paste.expiresAt) : null;
      if (expiresAt && expiresAt <= currentTime) return false;
      if (paste.maxViews !== null && paste.viewCount >= paste.maxViews) return false;
      return true;
    });

    return filtered
      .map(toPasteResponse)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const rows = await prisma.paste.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const available = rows.filter((r) => {
    if (r.expiresAt && r.expiresAt <= currentTime) return false;
    if (r.maxViews !== null && r.viewCount >= r.maxViews) return false;
    return true;
  });

  return available;
}

export async function deletePaste(id, currentTime, password) {
  if (!process.env.DATABASE_URL) {
    const pastes = await readPasteStore();
    const index = pastes.findIndex((p) => p.id === id);
    if (index === -1) return { error: 'NOT_FOUND' };
    const paste = pastes[index];
    const access = checkPrivateAccess(paste, password);
    if (!access.ok) return { error: access.code };
    pastes.splice(index, 1);
    await writePasteStore(pastes);
    return { ok: true };
  }
  const paste = await prisma.paste.findUnique({ where: { id } });
  if (!paste) return { error: 'NOT_FOUND' };
  const access = checkPrivateAccess(paste, password);
  if (!access.ok) return { error: access.code };
  await prisma.paste.delete({ where: { id } });
  return { ok: true };
}