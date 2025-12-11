import { ProductResponse } from "src/modules/products/dto/productResponse.dto";

export type CategoryResponse = {
  id: string;
  name: string;
}

export type CategoryResponseWithProducts = CategoryResponse & {
  products: {
    id: string;
    name: string;
    description: string | null;
    price: string; 
    imageUrl: string | null;
    isActive: boolean;
  }[];
  productCount: number;
};