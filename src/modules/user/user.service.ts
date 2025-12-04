import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';


@Injectable()
export class UserService {
  constructor(@Inject('DATABASE') private db: NodePgDatabase<typeof import('../../database/schema/users.schema')>) {}
  async create(userData: any) {
    const [user] = await this.db.insert(users).values(userData).returning();
    return user;
  }

  async findByEmail(email: string) {
    try {
      const [user] = await this.db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("=======Error finding user by email:============", error);
      return null;
    }
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async update(id: string, updateData: any) {
    const [updatedUser] = await this.db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
}
