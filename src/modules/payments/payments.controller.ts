import { Controller, Post, Body, RawBodyRequest, Req, UseGuards, Res, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) { }

  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent for order' })
  async createPaymentIntent(
    @Request() req,
    @Body() body: { orderId: string },
  ) {
    return this.paymentsService.createPaymentIntent(body.orderId, req.user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() request: RawBodyRequest<Request>, @Res() response: Response) {
    console.log('Webhook hit!');  // এটা console-এ দেখবেন কিনা চেক করুন
    const sig = request.headers['stripe-signature'] as string;
    const rawBody = request.rawBody;

    if (!sig || !rawBody) {
      return {
        message: 'Invalid request',
        statusCode: HttpStatus.BAD_REQUEST,
      }
    }

    try {
      const result = await this.paymentsService.handleWebhook(sig, rawBody);
      console.log(result);
      return {
        message: 'Success',
        data: result,
        statusCode: HttpStatus.OK,
      }
    } catch (error) {
      console.error('Webhook error:', error.message);
      return {
        message: 'Error processing webhook',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}