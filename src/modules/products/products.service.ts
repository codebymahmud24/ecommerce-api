import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { eq, like, gte, lte, and, sql, desc, ilike } from 'drizzle-orm';
import { products, categories, inventory } from 'src/database/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateProductDto, UpdateProductDto, SearchProductsDto } from './dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ProductsService {
  constructor(
    @Inject('DATABASE')
    private db: NodePgDatabase<typeof import('src/database/schema')>,
    private inventoryService: InventoryService,
  ) {}

  // Reusable select fields for DRY
  private readonly productSelect = {
    id: products.id,
    name: products.name,
    description: products.description,
    price: products.price,
    imageUrl: products.imageUrl,
    categoryId: products.categoryId,
    categoryName: categories.name,
    available: sql<number>`${inventory.quantity} - ${inventory.reserved}`,
    isActive: products.isActive,
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
  };

  // ---------------- CREATE PRODUCT ----------------
  async create(createProductDto: CreateProductDto) {
    try {
      return this.db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            ...createProductDto,
            price: createProductDto.price.toString(),
          })
          .returning();

        // Call InventoryService to initialize stock
        const [inventoryItem] = await tx
          .insert(inventory)
          .values({
            productId: product.id,
            quantity: 0,
            reserved: 0,
          })
          .returning();

        return [product, inventoryItem];
      });
    } catch (error) {
      Logger.error(error);
    }
  }

  // ---------------- READ ALL ----------------
  async findAll(page = 1, limit = 20, categoryId?: string) {
    try {
      const offset = (page - 1) * limit;
      const conditions = [eq(products.isActive, true)];
      if (categoryId) conditions.push(eq(products.categoryId, categoryId));
      return this.db
        .select(this.productSelect)
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(products.createdAt));
      // return this.db.select().from(products);
    } catch (error) {
      Logger.error(error);
    }
  }

  // ---------------- READ ONE ----------------
  async findOne(id: string) {
    try {
      const [product] = await this.db
        .select(this.productSelect)
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(eq(products.id, id));

      if (!product) throw new NotFoundException('Product not found');
      return product;
    } catch (error) {
      Logger.error(error);
    }
  }

  // ---------------- UPDATE ----------------
  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const { price, ...restData } = updateProductDto;
      const updateData = {
        ...restData,
        ...(price !== undefined && {
          price: price.toString(),
        }),
        updatedAt: new Date(),
      };

      const [updatedProduct] = await this.db
        .update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();

      if (!updatedProduct) throw new NotFoundException('Product not found');
      return updatedProduct;
    } catch (error) {
      Logger.error(error);
    }
  }

  // ---------------- DELETE (Soft) ----------------
  async remove(id: string) {
    try {
      const [product] = await this.db
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      if (!product) throw new NotFoundException('Product not found');
      return { message: 'Product deleted successfully' };
    } catch (error) {
      Logger.error(error);
    }
  }

  // ---------------- SEARCH ----------------
  async search(searchDto: SearchProductsDto) {
    try {
      const {
        query,
        minPrice,
        maxPrice,
        categoryId,
        page = 1,
        limit = 20,
      } = searchDto;
      const offset = (page - 1) * limit;
      const conditions = [eq(products.isActive, true)];

      if (query) conditions.push(ilike(products.name, `%${query}%`));
      if (minPrice !== undefined)
        conditions.push(gte(products.price, minPrice.toString()));
      if (maxPrice !== undefined)
        conditions.push(lte(products.price, maxPrice.toString()));
      if (categoryId) conditions.push(eq(products.categoryId, categoryId));

      return this.db
        .select(this.productSelect)
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(products.createdAt));
    } catch (error) {
      Logger.error(error);
    }
  }
}
