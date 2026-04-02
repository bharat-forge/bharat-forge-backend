import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import DealerProfile from '../models/DealerProfile';

export const createOrUpdateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const profileData = req.body;

    let profile = await DealerProfile.findOne({ user: userId });

    if (profile) {
      profile = await DealerProfile.findOneAndUpdate({ user: userId }, profileData, { new: true });
    } else {
      profile = new DealerProfile({ ...profileData, user: userId });
      await profile.save();
    }

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await DealerProfile.findOne({ user: req.user._id }).populate('productCategories');
    if (!profile) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }
    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllDealers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dealers = await DealerProfile.find()
      .populate('user', 'email')
      .populate('productCategories', 'name');
    res.status(200).json(dealers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateDealerStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, pricingTier } = req.body;

    const dealer = await DealerProfile.findByIdAndUpdate(
      id,
      { status, pricingTier },
      { new: true }
    );

    if (!dealer) {
      res.status(404).json({ message: 'Dealer not found' });
      return;
    }

    res.status(200).json(dealer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};