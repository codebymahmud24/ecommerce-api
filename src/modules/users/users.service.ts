import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { User, users } from '../../database/schema';
import { RegisterDto } from '../auth/dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @Inject('DATABASE')
    private db: NodePgDatabase<
      typeof import('../../database/schema/users.schema')
    >,
  ) {}

  /**
   * -------------- Create New User -----------------
   * @param RegisterDto
   * @returns Promise<User | null>
   */
  async create(userData: RegisterDto): Promise<User | null> {
    try {
      const [user] = await this.db.insert(users).values(userData).returning();
      if (!user) return null;
      return user;
    } catch (error) {
      this.logger.error('Error creating user', error.message);
      throw new Error(error.message);
    }
  }

  /**
   * ------------ Find Users By Email -----------------
   * @param email
   * @returns Promise<User | null>
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) return null;
      return user;
    } catch (error) {
      this.logger.error('Error finding user by email', error.message);
      throw new Error(error.message);
    }
  }

  /**
   * ------------ Find Users By Id -----------------
   * @param id
   * @returns Promise<User | null>
   */
  async findById(id: string): Promise<User | null> {
    try {
      const [user] = await this.db.select().from(users).where(eq(users.id, id));

      if (!user) return null;
      return user;
    } catch (error) {
      this.logger.error('Error finding user by ID', error.message);
      throw new Error(error.message);
    }
  }

  /**
   * ------------ Update User -----------------
   * @param id
   * @param updateData
   * @returns Promise<User | null>
   */
  async update(id: string, updateData: any): Promise<User | null> {
    try {
      const [updatedUser] = await this.db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) return null;
      return updatedUser;
    } catch (error) {
      this.logger.error('Error updating user', error.message);
      throw new Error(error.message);
    }
  }
}
