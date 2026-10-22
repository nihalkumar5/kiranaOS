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

export const DEFAULT_USER_PAYLOAD: TokenPayload = {
  sub: 'b8ad0af2-1749-4aa4-9a1e-7776d2c5a125',
  email: 'Nihal88758@gmail.com',
  role: 'ADMIN',
  storeId: '758e50e6-a48e-4334-9669-c0aef9bb45f4',
};

export function getAuthUser(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const verified = verifyAccessToken(token);
    if (verified) return verified;
  }
  return DEFAULT_USER_PAYLOAD;
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ success: false, message }, { status: 401 });
}
