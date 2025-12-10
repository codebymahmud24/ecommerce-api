import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/database';
import { inventory } from 'src/database/schema';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly RESERVATION_TTL_MINUTES = 15;
  constructor(
    @Inject('DATABASE') private db: NodePgDatabase<typeof schema>,
  ) {}

  // ----- Create empty inventory during product creation-----
  async createInitialInventory(productId: string) {
    try {
      const [row] = await this.db
      .insert(inventory)
      .values({
        productId,
        quantity: 0,
        reserved: 0,
      })
      .returning();

    return row;
    } catch (error) {
      Logger.error(error.message);
    }
  }
}
