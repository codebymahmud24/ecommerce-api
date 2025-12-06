import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, like, sql } from 'drizzle-orm';
import { categories, products } from 'src/database/schema';
import { schema } from 'src/database';

@Injectable()
export class CategoryService {
  constructor(@Inject('DATABASE') private db: NodePgDatabase<typeof schema>) {}

  /**
   * Create a new category
   */
  async create(createCategoryDto: CreateCategoryDto) {
    // modify the slug to make it URL-friendly
    createCategoryDto.slug = createCategoryDto.slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
      
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
  }

  /**
   * Get all categories with product counts
   */
  async findAll() {
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
  }

  /**
   * Get category by ID with products
   */
  async findOne(id: string) {
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
  }

  /**
   * Get category by slug
   */
  async findBySlug(slug: string) {
    // modify the slug to make it URL-friendly
    slug = slug.trim().toLowerCase().replace(/\s+/g, '-');

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
  }

  /**
   * Update category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    const [existingCategory] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id));

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Modify the slug to make it URL-friendly
    if (updateCategoryDto.slug) {
      updateCategoryDto.slug = updateCategoryDto.slug
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
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
  }

  /**
   * Delete category (only if no products)
   */
  async remove(id: string) {
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
  }

  /**
   * Search categories by name
   */
  async search(query: string) {
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
  }

  /**
   * Get popular categories (most products)
   */
  async getPopular(limit = 10) {
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
  }
}
