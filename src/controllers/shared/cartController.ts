import { Response } from 'express';
import { db } from '../../configs/db';
import { carts, cartItems, products, dealerAuthorizedProducts, dealerProfiles } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const getMyCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    let cart = await db.select().from(carts).where(eq(carts.userId, userId));
    if (cart.length === 0) {
      cart = await db.insert(carts).values({ userId }).returning();
    }

    const items = await db.select({
      id: cartItems.id,
      productId: products.id,
      name: products.name,
      sku: products.sku,
      price: cartItems.price,
      quantity: cartItems.quantity,
      images: products.images,
      stock: products.stock
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cart[0].id));

    res.status(200).json({ cart: cart[0], items });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    const product = await db.select().from(products).where(eq(products.id, productId));
    if (product.length === 0 || product[0].status !== 'ACTIVE') {
      res.status(404).json({ message: 'Product not found or inactive' });
      return;
    }

    if (product[0].stock < quantity) {
      res.status(400).json({ message: 'Insufficient stock' });
      return;
    }

    if (req.user.role === 'DEALER') {
      const dealer = await db.select().from(dealerProfiles).where(eq(dealerProfiles.userId, userId));
      if (dealer.length > 0) {
        const authCheck = await db.select().from(dealerAuthorizedProducts).where(
          and(eq(dealerAuthorizedProducts.dealerId, dealer[0].id), eq(dealerAuthorizedProducts.productId, productId))
        );
        if (authCheck.length === 0 || authCheck[0].status !== 'APPROVED') {
          res.status(403).json({ message: 'You are not authorized to purchase this specific product. Request dealership first.' });
          return;
        }
      }
    }

    let cart = await db.select().from(carts).where(eq(carts.userId, userId));
    if (cart.length === 0) {
      cart = await db.insert(carts).values({ userId }).returning();
    }

    const existingItem = await db.select().from(cartItems).where(
      and(eq(cartItems.cartId, cart[0].id), eq(cartItems.productId, productId))
    );

    let unitPrice = product[0].basePrice;
    if (req.user.role === 'DEALER' && Array.isArray(product[0].bulkPricing) && product[0].bulkPricing.length > 0) {
      const tiers = [...product[0].bulkPricing];
      const sortedTiers = tiers.sort((a, b) => b.minQuantity - a.minQuantity);
      const totalQty = (existingItem.length > 0 ? existingItem[0].quantity : 0) + quantity;
      for (const tier of sortedTiers) {
        if (totalQty >= tier.minQuantity) {
          unitPrice = tier.price;
          break;
        }
      }
    }

    const moq = product[0].moq || 1;

    if (existingItem.length > 0) {
      const newQty = existingItem[0].quantity + quantity;
      await db.update(cartItems).set({ quantity: newQty, price: unitPrice }).where(eq(cartItems.id, existingItem[0].id));
    } else {
      if (quantity < moq && req.user.role === 'DEALER') {
        res.status(400).json({ message: `Minimum order quantity is ${moq}` });
        return;
      }
      await db.insert(cartItems).values({ cartId: cart[0].id, productId, quantity, price: unitPrice });
    }

    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart[0].id));

    res.status(200).json({ message: 'Added to cart' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const clearMyCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const cart = await db.select().from(carts).where(eq(carts.userId, userId));
    if (cart.length > 0) {
      await db.delete(cartItems).where(eq(cartItems.cartId, cart[0].id));
    }
    res.status(200).json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCartItemQuantity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      await db.delete(cartItems).where(eq(cartItems.id, itemId));
      res.status(200).json({ message: 'Item removed from cart' });
      return;
    }

    const existingItem = await db.select().from(cartItems).where(eq(cartItems.id, itemId));
    
    if (existingItem.length === 0) {
      res.status(404).json({ message: 'Cart item not found' });
      return;
    }

    const product = await db.select().from(products).where(eq(products.id, existingItem[0].productId));

    if (product[0].stock < quantity) {
      res.status(400).json({ message: 'Insufficient stock available' });
      return;
    }

    let unitPrice = product[0].basePrice;
    
    if (req.user.role === 'DEALER') {
      const moq = product[0].moq || 1;
      if (quantity < moq) {
        res.status(400).json({ message: `Minimum order quantity is ${moq}` });
        return;
      }

      if (Array.isArray(product[0].bulkPricing) && product[0].bulkPricing.length > 0) {
        const tiers = [...product[0].bulkPricing];
        const sortedTiers = tiers.sort((a, b) => b.minQuantity - a.minQuantity);
        for (const tier of sortedTiers) {
          if (quantity >= tier.minQuantity) {
            unitPrice = tier.price;
            break;
          }
        }
      }
    }

    await db.update(cartItems)
      .set({ quantity, price: unitPrice })
      .where(eq(cartItems.id, itemId));

    await db.update(carts)
      .set({ updatedAt: new Date() })
      .where(eq(carts.id, existingItem[0].cartId));

    res.status(200).json({ message: 'Quantity updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};