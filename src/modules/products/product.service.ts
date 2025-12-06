import { Inject, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { schema } from '../../database';
import { products, inventory } from 'src/database/schema';

@Injectable()
export class ProductService {
  constructor(
    @Inject('DATABASE') private readonly db: NodePgDatabase<typeof schema>,
  ) {}
}
