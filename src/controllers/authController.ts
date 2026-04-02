import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateOTP } from '../utils/otp';
import { generateToken } from '../utils/jwt';
import emailConfig from '../configs/email';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role, password } = req.body;
    let user = await User.findOne({ email });

    if (user) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    console.log(otp)
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user = new User({
      email,
      role,
      password: hashedPassword,
      otp,
      otpExpires
    });

    await user.save();

    await emailConfig.sendEmail(
      email,
      'Your Bharat Forge Registration OTP',
      `<h1>Your OTP is ${otp}</h1><p>It expires in 10 minutes.</p>`
    );

    res.status(201).json({ message: 'Registration successful, OTP sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ message: 'Please verify your email first' });
      return;
    }

    const otp = generateOTP();
    console.log(otp)
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await emailConfig.sendEmail(
      email,
      'Your Bharat Forge Login OTP',
      `<h1>Your OTP is ${otp}</h1><p>It expires in 10 minutes.</p>`
    );

    res.status(200).json({ message: 'Credentials verified, 2FA OTP sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user.id, user.role);
    res.status(200).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, type } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (type === 'register' && user.isVerified) {
      res.status(400).json({ message: 'User is already verified' });
      return;
    }

    const otp = generateOTP();
    console.log(otp)
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const subject = type === 'login' ? 'Your Bharat Forge Login OTP' : 'Your Bharat Forge Registration OTP';

    await emailConfig.sendEmail(
      email,
      subject,
      `<h1>Your new OTP is ${otp}</h1><p>It expires in 10 minutes.</p>`
    );

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};