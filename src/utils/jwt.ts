import jwt from 'jsonwebtoken';

export const generateAccessToken = (id: string, role: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("INTERNAL_ERROR: JWT_SECRET is missing in environment variables");
  
  return jwt.sign({ id, role }, secret, { expiresIn: '1d' });
};

export const generateRefreshToken = (id: string) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("INTERNAL_ERROR: JWT_REFRESH_SECRET is missing in environment variables");

  return jwt.sign({ id }, secret, { expiresIn: '7d' });
};