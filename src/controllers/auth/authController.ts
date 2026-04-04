import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../configs/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { generateOTP } from '../../utils/otp';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { verifyCaptcha } from '../../utils/captcha';
import emailConfig from '../../configs/email';
import { redisClient } from '../../configs/redis';
import { logger } from '@/utils/logger';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, role, password, captchaToken } = req.body;

        if (!captchaToken) {
            return void res.status(400).json({ message: 'Captcha verification is required' });
        }

        const isCaptchaValid = await verifyCaptcha(captchaToken);
        if (!isCaptchaValid) {
            logger.warn(`Registration failed: Invalid Captcha for ${email}`);
            return void res.status(400).json({ message: 'Invalid Captcha' });
        }

        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        if (existingUsers.length > 0) {
            return void res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = generateOTP();
        const mappedRole = role === 'ADMIN' || role === 'DEALER' ? role : 'USER';

        const redisKey = `OTP:REGISTER:${email}`;
        const pendingUserData = { email, password: hashedPassword, role: mappedRole, otp };
        await redisClient.setEx(redisKey, 600, JSON.stringify(pendingUserData));

        await emailConfig.sendEmail(
            email,
            'Verify Your Account',
            `<h1>Your Registration OTP is ${otp}</h1><p>It expires in 10 minutes.</p>`
        );

        logger.info(`Registration OTP sent successfully to: ${email}`);
        res.status(201).json({ message: 'Registration successful, verify OTP to continue' });
    } catch (error) {
        logger.error(`Registration Error for ${req.body.email}:`, error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        if (existingUsers.length === 0) {
            return void res.status(404).json({ message: 'Invalid credentials' });
        }

        const user = existingUsers[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Login failed: Incorrect password for ${email}`);
            return void res.status(400).json({ message: 'Invalid credentials' });
        }

        const settings = (user.settings as Record<string, any>) || {};
        const isTwoFactorEnabled = settings.isTwoFactorEnabled !== false;

        if (!isTwoFactorEnabled) {
            const accessToken = generateAccessToken(user.id, user.role);
            const refreshToken = generateRefreshToken(user.id);

            await db.update(users).set({ refreshToken }).where(eq(users.id, user.id));

            logger.info(`User logged in directly (2FA disabled): ${email}`);
            return void res.status(200).json({
                token: accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, role: user.role }
            });
        }

        const otp = generateOTP();
        const redisKey = `OTP:LOGIN:${email}`;
        
        await redisClient.setEx(redisKey, 600, JSON.stringify({ otp }));

        logger.info(`Login 2FA OTP generated for: ${email}`);
        res.status(200).json({ message: 'Credentials verified, 2FA OTP sent to email', requires2FA: true });
    } catch (error) {
        logger.error(`Login Error for ${req.body.email}:`, error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, type } = req.body;
        const redisKey = `OTP:${type}:${email}`;

        const storedDataStr = await redisClient.get(redisKey);
        if (!storedDataStr) {
            logger.warn(`OTP Verification failed: Expired or missing key ${redisKey}`);
            return void res.status(400).json({ message: 'OTP expired or invalid. Please request a new one.' });
        }

        const storedData = JSON.parse(storedDataStr);

        if (storedData.otp !== otp) {
            logger.warn(`OTP Verification failed: Invalid code provided for ${email}`);
            return void res.status(400).json({ message: 'Invalid OTP' });
        }

        if (type === 'REGISTER') {
            const newUser = await db.insert(users).values({
                email: storedData.email,
                password: storedData.password,
                role: storedData.role
            }).returning();

            const user = newUser[0];
            const accessToken = generateAccessToken(user.id, user.role);
            const refreshToken = generateRefreshToken(user.id);

            await db.update(users).set({ refreshToken }).where(eq(users.id, user.id));
            await redisClient.del(redisKey);

            logger.info(`New user registered and verified: ${email}`);
            return void res.status(201).json({
                message: 'Account verified and created successfully.',
                token: accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, role: user.role }
            });
        }

        if (type === 'LOGIN') {
            const existingUsers = await db.select().from(users).where(eq(users.email, email));
            const user = existingUsers[0];
            
            const accessToken = generateAccessToken(user.id, user.role);
            const refreshToken = generateRefreshToken(user.id);

            await db.update(users).set({ refreshToken }).where(eq(users.id, user.id));
            await redisClient.del(redisKey);

            logger.info(`User 2FA verified and logged in: ${email}`);
            return void res.status(200).json({
                token: accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, role: user.role }
            });
        }

        if (type === 'FORGOT_PASSWORD') {
            logger.info(`Password reset OTP verified for: ${email}`);
            return void res.status(200).json({ message: 'OTP verified. Proceed to reset password.' });
        }

        res.status(400).json({ message: 'Invalid operation type' });
    } catch (error) {
        logger.error(`Verify OTP Error for ${req.body.email}:`, error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, type } = req.body;
        const redisKey = `OTP:${type}:${email}`;
        const newOtp = generateOTP();

        let subject = 'Your OTP Code';

        if (type === 'REGISTER') {
            const storedStr = await redisClient.get(redisKey);
            if (!storedStr) {
                return void res.status(400).json({ message: 'Registration session expired. Please start over.' });
            }
            const storedData = JSON.parse(storedStr);
            storedData.otp = newOtp;
            await redisClient.setEx(redisKey, 600, JSON.stringify(storedData));
            subject = 'Resent: Registration OTP';
        } else {
            const existingUsers = await db.select().from(users).where(eq(users.email, email));
            if (existingUsers.length === 0) {
                return void res.status(404).json({ message: 'User not found' });
            }
            await redisClient.setEx(redisKey, 600, JSON.stringify({ otp: newOtp }));
            subject = type === 'LOGIN' ? 'Resent: Login OTP' : 'Resent: Password Reset OTP';
        }

        await emailConfig.sendEmail(
            email,
            subject,
            `<h1>Your new OTP is ${newOtp}</h1><p>It expires in 10 minutes.</p>`
        );

        logger.info(`OTP Resent successfully (${type}) to: ${email}`);
        res.status(200).json({ message: 'OTP resent successfully' });
    } catch (error) {
        logger.error(`Resend OTP Error for ${req.body.email}:`, error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        if (existingUsers.length === 0) {
            return void res.status(404).json({ message: 'User not found' });
        }

        const otp = generateOTP();
        const redisKey = `OTP:FORGOT_PASSWORD:${email}`;
        
        await redisClient.setEx(redisKey, 600, JSON.stringify({ otp }));

        await emailConfig.sendEmail(
            email,
            'Password Reset Request',
            `<h1>Your Password Reset OTP is ${otp}</h1><p>It expires in 10 minutes. If you did not request this, please ignore.</p>`
        );

        logger.info(`Password reset request initiated for: ${email}`);
        res.status(200).json({ message: 'Password reset OTP sent to email' });
    } catch (error) {
        logger.error(`Forgot Password Error for ${req.body.email}:`, error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, newPassword } = req.body;
        const redisKey = `OTP:FORGOT_PASSWORD:${email}`;

        const storedStr = await redisClient.get(redisKey);
        if (!storedStr) {
            return void res.status(400).json({ message: 'OTP expired or invalid' });
        }

        const storedData = JSON.parse(storedStr);
        if (storedData.otp !== otp) {
            return void res.status(400).json({ message: 'Invalid OTP' });
        }

        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        if (existingUsers.length === 0) {
            return void res.status(404).json({ message: 'User not found' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.update(users)
            .set({ password: hashedPassword, refreshToken: null })
            .where(eq(users.id, existingUsers[0].id));

        await redisClient.del(redisKey);

        logger.info(`Password successfully reset for: ${email}`);
        res.status(200).json({ message: 'Password reset successfully. All existing sessions invalidated.' });
    } catch (error) {
        logger.error(`Reset Password Error for ${req.body.email}:`, error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return void res.status(401).json({ message: 'Refresh token is required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;

        const existingUsers = await db.select().from(users).where(eq(users.id, decoded.id));
        if (existingUsers.length === 0 || existingUsers[0].refreshToken !== refreshToken) {
            logger.warn(`Token Refresh failed: Invalid or mismatched token for user ID ${decoded?.id}`);
            return void res.status(403).json({ message: 'Invalid refresh token' });
        }

        const user = existingUsers[0];
        const newAccessToken = generateAccessToken(user.id, user.role);
        const newRefreshToken = generateRefreshToken(user.id);

        await db.update(users)
            .set({ refreshToken: newRefreshToken })
            .where(eq(users.id, user.id));

        res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        logger.error(`Refresh Token Error:`, error);
        res.status(403).json({ message: 'Token expired or invalid' });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        await db.update(users).set({ refreshToken: null }).where(eq(users.email, email));
        logger.info(`User logged out: ${email}`);
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error(`Logout Error for ${req.body.email}:`, error);
        res.status(500).json({ message: 'Server error', error });
    }
};