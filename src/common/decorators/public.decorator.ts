import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Usage: Mark routes that don't require authentication
// @Public()
// @Get('public-route')
// async publicRoute() { ... }