import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Cart } from './dto';

@Injectable()
export class CartService {
  private readonly CART_TTL = 3600 * 24; // 1 day in seconds
  private readonly CART_PREFIX = 'cart:';
  private logger = new Logger(CartService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private productsService: ProductsService,
  ) {}

  private getCartKey(userId: string): string {
    return `${this.CART_PREFIX}${userId}`;
  }

  /**
   * ----------------- Get Cart for User --------------
   * @param userId 
   * @returns 
   */
  async getCart(userId: string): Promise<Cart> {
    try {
      const cart = await this.cacheManager.get<Cart>(this.getCartKey(userId));
      return cart || { items: [], total: 0, updatedAt: new Date() };
    } catch (error) {
      this.logger.error('Error getting cart from Redis', error.message);
      throw new InternalServerErrorException('Failed to retrieve cart');
    }
  }

  /**
   * -------------- Add Item to Cart -------------
   * @param userId
   * @param productId
   * @param quantity
   * @returns
   */
  async addItem(
    userId: string,
    productId: string,
    quantity: number = 1,
  ): Promise<Cart> {
    try {
      if (quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      const product = await this.productsService.findOne(productId);
      if (!product) {
        throw new BadRequestException(
          `Product with id ${productId} does not exist`,
        );
      }

      const cart = await this.getCart(userId);

      const existingItem = cart.items.find(
        (item) => item.productId === productId,
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({
          productId: product.id,
          name: product.name,
          price: parseFloat(product.price.toString()),
          quantity,
        });
      }

      cart.total = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      cart.updatedAt = new Date();

      await this.cacheManager.set(
        this.getCartKey(userId),
        cart,
        this.CART_TTL * 1000, // Convert to milliseconds
      );
      return cart;
    } catch (error) {
      this.logger.error('Error adding item to cart', error.message);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to add item to cart');
    }
  }

  /**
   * --------------- Update Item Quantity -------------
   * @param userId
   * @param productId
   * @param quantity
   * @returns 
   */
  async updateItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    try {
      if (quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      const cart = await this.getCart(userId);
      const item = cart.items.find((item) => item.productId === productId);

      if (!item) {
        throw new BadRequestException('Item not found in cart');
      }

      item.quantity = quantity;
      cart.total = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      cart.updatedAt = new Date();

      await this.cacheManager.set(
        this.getCartKey(userId),
        cart,
        this.CART_TTL * 1000,
      );
      return cart;
    } catch (error) {
      this.logger.error('Error updating item in cart', error.message);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update cart item');
    }
  }

  /**
   * ---------------- Remove Item From Cart ---------------
   * @param userId
   * @param productId
   * @returns 
   */
  async removeItem(userId: string, productId: string): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);
      cart.items = cart.items.filter((item) => item.productId !== productId);
      cart.total = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      cart.updatedAt = new Date();

      if (cart.items.length === 0) {
        await this.cacheManager.del(this.getCartKey(userId));
        return { items: [], total: 0, updatedAt: new Date() };
      }

      await this.cacheManager.set(
        this.getCartKey(userId),
        cart,
        this.CART_TTL * 1000,
      );

      return cart;
    } catch (error) {
      this.logger.error('Error removing item from cart', error.message);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove cart item');
    }
  }

  /**
   *  ---------------- Clear Cart --------------------
   * @param userId
   * @returns 
   */
  async clearCart(userId: string): Promise<void> {
    try {
      await this.cacheManager.del(this.getCartKey(userId));
    } catch (error) {
      this.logger.error('Error clearing cart', error.message);
      throw new InternalServerErrorException('Failed to clear cart');
    }
  }
}