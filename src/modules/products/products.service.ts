import {
  Injectable,
  NotFoundException,
  Inject,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq, gte, lte, and, sql, desc, ilike } from 'drizzle-orm';
import { products, categories, inventory } from 'src/database/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateProductDto, UpdateProductDto, SearchProductsDto } from './dto';
import { ProductResponse } from './dto';
import * as schema from 'src/database/schema';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    @Inject('DATABASE')
    private db: NodePgDatabase<typeof schema>,
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

  /**
   * -----------CREATE NEW PRODUCT AND INIT STOCK----------------
   * @param createProductDto
   * @returns Promise<ProductResponse | null>
   */
  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponse | null> {
    try {
      return this.db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            ...createProductDto,
            price: createProductDto.price.toString(),
          })
          .returning();

        if (!product) {
          throw new InternalServerErrorException('Failed to create product');
        }
        // Call InventoryService to initialize stock
        await tx.insert(inventory).values({
            productId: product.id,
            quantity: 0,
            reserved: 0,
          })
          .returning();

        return product;
      });
    } catch (error) {
      this.logger.error('Error creating product', error.message);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  /**
   * ----------------- READ ALL  PRODUCTS ----------------
   * @param page
   * @param limit
   * @param categoryId
   * @returns Promise<ProductResponse[] | null>
   */
  async findAll(
    page = 1,
    limit = 20,
    categoryId?: string,
  ): Promise<ProductResponse[]> {
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
    } catch (error) {
     this.logger.error('Error fetching products', error.message);
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }

  /**
   * --------------- READ ONE PRODUCT BY ID ----------------
   * @param id
   * @returns  Promise<ProductResponse | null>
   */
  async findOne(id: string): Promise<ProductResponse | null> {
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
      this.logger.error(`Error finding product ${id}`, error.message);
      throw new InternalServerErrorException('Failed to fetch product');
    }
  }

  /**
   * ---------------------- UPDATE PRODUCT BY ID ----------------
   * @param id
   * @param updateProductDto
   * @returns
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponse> {
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
      this.logger.error(`Error updating product ${id}`, error.message);
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  /**
   * ---------------------- DELETE PRODUCT BY ID ----------------
   * @param id
   * @returns Promise<{ message: string }>
   */
  async remove(id: string): Promise<{ message: string }> {
    try {
      const [product] = await this.db
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      if (!product) throw new NotFoundException('Product not found');
      return { message: 'Product deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting product ${id}`, error.message);
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  /**
   * --------------------- SEARCH PRODUCTS ---------------------
   * @param searchDto
   * @returns Promise<ProductResponse[]>
   */
  async search(searchDto: SearchProductsDto): Promise<ProductResponse[]> {
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
      this.logger.error('Error searching products', error.message);
      throw new InternalServerErrorException('Failed to search products');
    }
  }
}
