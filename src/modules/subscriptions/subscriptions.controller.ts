// src/modules/subscriptions/subscriptions.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutSessionDto } from './dto/checkout-session.dto';
import { CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  @ApiOkResponse({ description: 'Active plans fetched successfully' })
  async listPlans() {
    const plans = await this.subscriptionsService.listActivePlans();
    return { message: 'Plans fetched successfully', data: plans };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current subscription status' })
  @ApiOkResponse({ description: 'Subscription status fetched successfully' })
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    const status = await this.subscriptionsService.getMyStatus(user.id);
    return {
      message: 'Subscription status fetched successfully',
      data: status,
    };
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get remaining requests for the current billing period',
  })
  @ApiOkResponse({ description: 'Usage fetched successfully' })
  async getUsage(@CurrentUser() user: AuthenticatedUser) {
    const usage = await this.subscriptionsService.getUsage(user.id);
    return { message: 'Usage fetched successfully', data: usage };
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Create a Stripe Checkout session to upgrade to a paid plan',
  })
  @ApiOkResponse({ description: 'Checkout session created successfully' })
  async checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const result = await this.subscriptionsService.createCheckoutSession(
      user.id,
      dto.planCode,
    );
    return { message: 'Checkout session created successfully', data: result };
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create a Stripe Billing Portal session' })
  @ApiOkResponse({ description: 'Portal session created successfully' })
  async portal(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.subscriptionsService.createPortalSession(user.id);
    return { message: 'Portal session created successfully', data: result };
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel the current subscription at period end' })
  @ApiOkResponse({ description: 'Subscription canceled successfully' })
  async cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }
}
