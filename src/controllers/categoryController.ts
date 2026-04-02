import { Request, Response } from 'express';
import Category from '../models/Category';

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, description, imageUrl } = req.body;
    
    const existingCategory = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existingCategory) {
      res.status(400).json({ message: 'Category name or slug already exists' });
      return;
    }

    const category = new Category({ name, slug, description, imageUrl });
    await category.save();

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const category = await Category.findByIdAndUpdate(id, updates, { new: true });
    if (!category) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};