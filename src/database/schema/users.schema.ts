import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { Role } from 'src/common/enums/role.enum';

// export const roleEnum = pgEnum('role', ['admin', 'customer', 'guest']);
export const roleEnum = pgEnum(
  'role',
  Object.values(Role) as [string, ...string[]],
);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: roleEnum('role').default(Role.CUSTOMER).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// === Proper Type Exports ===
export type User = InferSelectModel<typeof users>;                    // Full user from DB
export type NewUser = InferInsertModel<typeof users>;                  // For inserting
export type UserWithoutPassword = Omit<User, 'password'>;              // Safe user for responses