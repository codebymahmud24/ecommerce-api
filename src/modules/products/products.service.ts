import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { eq, like, gte, lte, and, sql, desc } from 'drizzle-orm';
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
    return this.db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          ...createProductDto,
          price: createProductDto.price.toString(),
        })
        .returning();

      // Call InventoryService to initialize stock
      await this.inventoryService.createInitialInventory(product.id);

      return product;
    });
  }

  // ---------------- READ ALL ----------------
  async findAll(page = 1, limit = 20, categoryId?: string) {
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
  }

  // ---------------- READ ONE ----------------
  async findOne(id: string) {
    const [product] = await this.db
      .select(this.productSelect)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.id, id));

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ---------------- UPDATE ----------------
  async update(id: string, updateProductDto: UpdateProductDto) {
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
  }

  // ---------------- DELETE (Soft) ----------------
  async remove(id: string) {
    const [product] = await this.db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!product) throw new NotFoundException('Product not found');
    return { message: 'Product deleted successfully' };
  }

  // ---------------- SEARCH ----------------
  async search(searchDto: SearchProductsDto) {
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

    if (query) conditions.push(like(products.name, `%${query}%`));
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
  }
}
