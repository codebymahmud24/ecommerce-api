import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddToCartDto, Cart, UpdateCartDto } from './dto';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  async getCarts(@Request() req) : Promise<Cart> {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(@Request() req, @Body() addToCartDto: AddToCartDto): Promise<Cart> {
    return this.cartService.addItem(
      req.user.id,
      addToCartDto.productId,
      addToCartDto.quantity,
    );
  }

  @Put('items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateItem(
    @Request() req,
    @Param('productId') productId: string,
    @Body() updateCartDto: UpdateCartDto,
  ): Promise<Cart> {
    return this.cartService.updateItem(req.user.id, productId, updateCartDto.quantity);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(@Request() req, @Param('productId') productId: string) : Promise< {message:string}> {
    await this.cartService.removeItem(req.user.id, productId);
    return {"message": "Item removed from cart successfully"}
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Request() req) : Promise<{message:string}> {
    await this.cartService.clearCart(req.user.id);
    return { message: 'Cart cleared successfully' };
  }
}