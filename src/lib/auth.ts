import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_kiranaos_jwt_key_9988';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'superrefresh_kiranaos_jwt_key_9988';

export interface TokenPayload {
  sub: string; // userId
  email: string;
  role: 'ADMIN' | 'STAFF';
  storeId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyAccessToken(token);
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ success: false, message }, { status: 401 });
}
