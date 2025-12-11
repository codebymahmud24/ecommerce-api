import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { User, users } from '../../database/schema';
import { RegisterDto } from '../auth/dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('DATABASE')
    private db: NodePgDatabase<
      typeof import('../../database/schema/users.schema')
    >,
  ) { }

  /**
   * -------------- Create New User -----------------
   * @param RegisterDto
   * @returns Promise<User | null>
   */
  async create(userData: RegisterDto): Promise<User | null> {
    const [user] = await this.db.insert(users).values(userData).returning();
    if (!user) return null;
    return user;
  }

  /**
   * ------------ Find Users By Email -----------------
   * @param email
   * @returns Promise<User | null>
   */
  async findByEmail(email: string): Promise<User | null> {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) return null;
      return user;
  }

  /**
   * ------------ Find Users By Id -----------------
   * @param id
   * @returns Promise<User | null>
   */
  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    // remove password field before returning the user object
    if (!user) return null;
    return user;
  }

  /**
   * ------------ Update User -----------------
   * @param id
   * @param updateData
   * @returns Promise<User | null>
   */
  async update(
    id: string,
    updateData: any,
  ): Promise<User | null> {
    const [updatedUser] = await this.db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) return null;
    return updatedUser;
  }
}
