// src/modules/admin/admin.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { sql, gte, lte, eq, desc } from 'drizzle-orm';
import { orders, products, users, orderItems } from '../../database/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from "src/database"


@Injectable()
export class AdminService {
  constructor(
    @Inject("DATABASE") private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(startDate?: Date, endDate?: Date) {
    const dateFilter = [];
    if (startDate) dateFilter.push(gte(orders.createdAt, startDate));
    if (endDate) dateFilter.push(lte(orders.createdAt, endDate));

    // Total revenue
    const [revenueData] = await this.db
      .select({
        totalRevenue: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
        orderCount: sql<number>`COUNT(*)`,
        avgOrderValue: sql<number>`AVG(CAST(${orders.total} AS DECIMAL))`,
      })
      .from(orders)
      .where(dateFilter.length > 0 ? sql`${sql.join(dateFilter, sql` AND `)}` : undefined);

    // Total customers
    const [customerData] = await this.db
      .select({
        totalCustomers: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(eq(users.role, 'customer'));

    // Total products
    const [productData] = await this.db
      .select({
        totalProducts: sql<number>`COUNT(*)`,
        activeProducts: sql<number>`COUNT(CASE WHEN ${products.isActive} THEN 1 END)`,
      })
      .from(products);

    // Order status breakdown
    const ordersByStatus = await this.db
      .select({
        status: orders.status,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
      })
      .from(orders)
      .groupBy(orders.status);

    // Top selling products
    const topProducts = await this.db
      .select({
        productId: orderItems.productId,
        productName: products.name,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        totalRevenue: sql<number>`SUM(CAST(${orderItems.price} AS DECIMAL) * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .groupBy(orderItems.productId, products.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(10);

    // Recent orders
    const recentOrders = await this.db
      .select({
        id: orders.id,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
        userEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return {
      revenue: {
        total: (revenueData?.totalRevenue || '0').toString(),
        orderCount: revenueData?.orderCount || 0,
        avgOrderValue: (revenueData?.avgOrderValue || '0').toString(),
      },
      customers: {
        total: customerData?.totalCustomers || 0,
      },
      products: {
        total: productData?.totalProducts || 0,
        active: productData?.activeProducts || 0,
      },
      ordersByStatus,
      topProducts,
      recentOrders,
    };
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailySales = await this.db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        orderCount: sql<number>`COUNT(*)`,
        revenue: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
      })
      .from(orders)
      .where(gte(orders.createdAt, startDate))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    return dailySales;
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts() {
    const lowStockProducts = await this.db
      .select({
        productId: products.id,
        productName: products.name,
        available: sql<number>`inventory.quantity - inventory.reserved`,
        threshold: sql<number>`inventory.low_stock_threshold`,
      })
      .from(products)
      .leftJoin(sql`inventory`, eq(products.id, sql`inventory.product_id`))
      .where(sql`inventory.quantity - inventory.reserved <= inventory.low_stock_threshold`)
      .orderBy(sql`inventory.quantity - inventory.reserved`);

    return lowStockProducts;
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights() {
    const topCustomers = await this.db
      .select({
        userId: users.id,
        userEmail: users.email,
        orderCount: sql<number>`COUNT(${orders.id})`,
        totalSpent: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .where(eq(users.role, 'customer'))
      .groupBy(users.id, users.email)
      .orderBy(desc(sql`SUM(CAST(${orders.total} AS DECIMAL))`))
      .limit(20);

    return topCustomers;
  }
}