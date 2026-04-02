import { Request, Response } from 'express';
import Product from '../models/Product';
import { uploadFileToS3 } from '../services/uploadService';

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData = req.body;
    const files = req.files as Express.Multer.File[];
    
    if (files && files.length > 0) {
      const imageUrls = await Promise.all(
        files.map((file) => uploadFileToS3(file.buffer, file.originalname, file.mimetype, 'products'))
      );
      productData.images = imageUrls;
    }

    if (typeof productData.bulkPricing === 'string') {
      productData.bulkPricing = JSON.parse(productData.bulkPricing);
    }
    if (typeof productData.specifications === 'string') {
      productData.specifications = JSON.parse(productData.specifications);
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    let query: any = { isActive: true };

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { hsnCode: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).populate('category', 'name slug');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};