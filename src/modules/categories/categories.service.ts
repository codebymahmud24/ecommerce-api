import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, like, sql } from 'drizzle-orm';
import { categories, products } from 'src/database/schema';
import { schema } from 'src/database';
import {
  CategoryResponse,
  CategoryResponseWithProducts,
} from './dto/categoryResponse.dto';

@Injectable()
export class CategoriesService {
  private logger = new Logger(CategoriesService.name);
  constructor(@Inject('DATABASE') private db: NodePgDatabase<typeof schema>) {}

  /**
   * --------------------- Create a new category -------------
   * @param createCategoryDto
   * @returns  Promise<CategoryResponse>
   */
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    try {
      // Check if slug already exists
      const [existingCategory] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.slug, createCategoryDto.slug));

      if (existingCategory) {
        throw new ConflictException('Category with this slug already exists');
      }

      const [category] = await this.db
        .insert(categories)
        .values(createCategoryDto)
        .returning();

      return category;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  /**
   * ------------------- Get all categories -------------
   * @returns Promise<CategoryResponse[]> | []
   */
  async findAll(): Promise<CategoryResponse[] | []> {
    try {
      const categoriesWithCount = await this.db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          createdAt: categories.createdAt,
          productCount: sql<number>`COUNT(${products.id})`,
        })
        .from(categories)
        .leftJoin(products, eq(categories.id, products.categoryId))
        .groupBy(categories.id);

      return categoriesWithCount;
    } catch (error) {
      this.logger.error('Error fetching categories', error.message);
      throw new InternalServerErrorException('Failed to fetch categories');
    }
  }

  /**
   * ------------ Get one category by ID -------------
   * @param id
   * @returns Promise<CategoryResponseWithProducts | []>
   */
  async findOne(id: string): Promise<CategoryResponseWithProducts | []> {
    try {
      const [category] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.id, id));

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Get products in this category
      const categoryProducts = await this.db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          description: products.description,
          imageUrl: products.imageUrl,
          isActive: products.isActive,
        })
        .from(products)
        .where(eq(products.categoryId, id));

      return {
        ...category,
        products: categoryProducts,
        productCount: categoryProducts.length,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error finding category ${id}`, error.message);
      throw new InternalServerErrorException('Failed to fetch category');
    }
  }

  /**
   * ------------- Find category by slug -------------
   * @param slug
   * @returns Promise<CategoryResponseWithProducts | []>
   */
  async findBySlug(slug: string): Promise<CategoryResponseWithProducts | []> {
    try {
      const [category] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug));

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Get products in this category
      const categoryProducts = await this.db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          imageUrl: products.imageUrl,
          isActive: products.isActive,
        })
        .from(products)
        .where(eq(products.categoryId, category.id));

      return {
        ...category,
        products: categoryProducts,
        productCount: categoryProducts.length,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error finding category by slug: ${slug}`, error.message);
      throw new InternalServerErrorException('Failed to fetch category');
    }
  }

  /**
   * ------------- Update an existing category -------------
   * @param id
   * @param updateCategoryDto
   * @returns Promise<CategoryResponse>
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    try {
      // Check if category exists
      const [existingCategory] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.id, id));

      if (!existingCategory) {
        throw new NotFoundException('Category not found');
      }

      // If updating slug, check if new slug is unique
      if (
        updateCategoryDto.slug &&
        updateCategoryDto.slug !== existingCategory.slug
      ) {
        const [slugExists] = await this.db
          .select()
          .from(categories)
          .where(eq(categories.slug, updateCategoryDto.slug));

        if (slugExists) {
          throw new ConflictException('Category with this slug already exists');
        }
      }

      const [updatedCategory] = await this.db
        .update(categories)
        .set(updateCategoryDto)
        .where(eq(categories.id, id))
        .returning();

      return updatedCategory;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`Error updating category ${id}`, error.message);
      throw new InternalServerErrorException('Failed to update category');
    }
  }

  /**
   * ------------- Delete an existing category and its associated products exist, delete them first -------------
   * @param id
   * @returns Promise<{message:string}>
   */
  async remove(id: string): Promise<{ message: string }> {
    try {
      // Check if category exists
      const [category] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.id, id));

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Check if category has products
      const [productCount] = await this.db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(products)
        .where(eq(products.categoryId, id));

      if (productCount.count > 0) {
        throw new ConflictException(
          `Cannot delete category with ${productCount.count} products. Please reassign or delete products first.`,
        );
      }

      await this.db.delete(categories).where(eq(categories.id, id));

      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error deleting category ${id}`, error.message);
      throw new InternalServerErrorException('Failed to delete category');
    }
  }

  /**
   * ------------- Search for categories based on the provided query -------------
   * @param query
   * @returns Promise<CategoryResponse[] | []>
   */
  async search(query: string): Promise<CategoryResponse[] | []> {
    try {
      // query = query.replace(/"/g, '');
      const results = await this.db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          productCount: sql<number>`COUNT(${products.id})`,
        })
        .from(categories)
        .leftJoin(products, eq(categories.id, products.categoryId))
        .where(like(categories.name, `%${query}%`))
        .groupBy(categories.id);

      return results;
    } catch (error) {
      this.logger.error('Error searching categories', error.message);
      throw new InternalServerErrorException('Failed to search categories');
    }
  }

  /**
   * ------------- Get top N most popular categories -------------
   * @param limit
   * @returns Promise<CategoryResponse[] | []>
   */
  async getPopular(limit = 10): Promise<CategoryResponse[] | []> {
    try {
      const popularCategories = await this.db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          productCount: sql<number>`COUNT(${products.id})`,
        })
        .from(categories)
        .leftJoin(products, eq(categories.id, products.categoryId))
        .groupBy(categories.id)
        .orderBy(sql`COUNT(${products.id}) DESC`)
        .limit(limit);

      return popularCategories;
    } catch (error) {
      this.logger.error('Error fetching popular categories', error.message);
      throw new InternalServerErrorException('Failed to fetch popular categories');
    }
  }
}
