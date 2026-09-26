// src/modules/subscriptions/subscriptions.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { UsageCounter } from './entities/usage-counter.entity';
import { User } from '../users/entities/user.entity';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionStatus } from '../../common/enums/subscription-status.enum';
import { PlanTier } from '../../common/enums/plan-tier.enum';

const FREE_PLAN_DURATION_DAYS = 365 * 10;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Plan) private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(UsageCounter)
    private readonly usageRepository: Repository<UsageCounter>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async listActivePlans(): Promise<Plan[]> {
    return this.plansRepository.find({
      where: { isActive: true },
      order: { priceCents: 'ASC' },
    });
  }

  async ensureFreeSubscription(userId: string): Promise<Subscription> {
    const existing = await this.getActiveSubscription(userId);
    if (existing) return existing;

    const freePlan = await this.plansRepository.findOne({
      where: { code: 'free' },
    });
    if (!freePlan) {
      throw new BadRequestException('Free plan is not configured');
    }

    return this.activateSubscription(userId, freePlan.id, {
      autoRenew: false,
      durationDays: FREE_PLAN_DURATION_DAYS,
    });
  }

  async getMyStatus(userId: string) {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }
    return this.toStatusResponse(subscription);
  }

  async getUsage(userId: string) {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const usage = await this.getOrCreateCurrentUsageCounter(
      userId,
      subscription.id,
    );

    return {
      period: { start: usage.periodStart, end: usage.periodEnd },
      chat: {
        limit: subscription.plan.chatRequestLimit,
        used: usage.chatRequestsUsed,
        remaining:
          subscription.plan.chatRequestLimit === -1
            ? null
            : Math.max(
                subscription.plan.chatRequestLimit - usage.chatRequestsUsed,
                0,
              ),
      },
      search: {
        limit: subscription.plan.searchRequestLimit,
        used: usage.searchRequestsUsed,
        remaining:
          subscription.plan.searchRequestLimit === -1
            ? null
            : Math.max(
                subscription.plan.searchRequestLimit - usage.searchRequestsUsed,
                0,
              ),
      },
      tokensUsed: Number(usage.tokensUsed),
    };
  }

  async createCheckoutSession(userId: string, planCode: string) {
    const plan = await this.plansRepository.findOne({
      where: { code: planCode },
    });
    if (!plan || plan.tier !== PlanTier.PREMIUM || !plan.stripePriceId) {
      throw new BadRequestException('Invalid or unavailable plan');
    }

    const user = await this.usersRepository.findOneOrFail({
      where: { id: userId },
    });
    const customerId = await this.ensureStripeCustomer(user);

    const session = await this.stripeService.client.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: this.configService.getOrThrow<string>('stripe.successUrl'),
      cancel_url: this.configService.getOrThrow<string>('stripe.cancelUrl'),
      metadata: { userId, planCode },
      subscription_data: { metadata: { userId, planCode } },
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session');
    }
    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const user = await this.usersRepository.findOneOrFail({
      where: { id: userId },
    });
    if (!user.stripeCustomerId) {
      throw new BadRequestException('No billing account found for this user');
    }

    const session =
      await this.stripeService.client.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: this.configService.getOrThrow<string>(
          'stripe.portalReturnUrl',
        ),
      });

    return { url: session.url };
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active paid subscription to cancel');
    }

    await this.stripeService.client.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    subscription.autoRenew = false;
    await this.subscriptionsRepository.save(subscription);

    return {
      message: 'Subscription will be canceled at the end of the billing period',
      data: null,
    };
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planCode = session.metadata?.planCode;
    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!userId || !planCode || !stripeSubscriptionId) {
      this.logger.warn('checkout.session.completed missing metadata, skipping');
      return;
    }

    const plan = await this.plansRepository.findOne({
      where: { code: planCode },
    });
    if (!plan) return;

    const stripeSub =
      await this.stripeService.client.subscriptions.retrieve(
        stripeSubscriptionId,
      );

    await this.activateSubscription(userId, plan.id, {
      stripeSubscriptionId,
      startsAt: new Date(stripeSub.current_period_start * 1000),
      endsAt: new Date(stripeSub.current_period_end * 1000),
      autoRenew: !stripeSub.cancel_at_period_end,
    });

    this.logger.log(`Subscription activated via checkout for user ${userId}`);
  }

  private async handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!subscription) return;

    subscription.status = this.mapStripeStatus(stripeSub.status);
    subscription.endsAt = new Date(stripeSub.current_period_end * 1000);
    subscription.autoRenew = !stripeSub.cancel_at_period_end;
    await this.subscriptionsRepository.save(subscription);
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!subscription) return;

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();
    await this.subscriptionsRepository.save(subscription);

    await this.ensureFreeSubscription(subscription.userId);
    this.logger.log(
      `Subscription ended, reverted user ${subscription.userId} to free plan`,
    );
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const stripeSubscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!stripeSubscriptionId) return;

    await this.subscriptionsRepository.update(
      { stripeSubscriptionId },
      { status: SubscriptionStatus.PAST_DUE },
    );
  }

  private async getActiveSubscription(
    userId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: [
        { userId, status: SubscriptionStatus.ACTIVE },
        { userId, status: SubscriptionStatus.TRIALING },
      ],
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  private async activateSubscription(
    userId: string,
    planId: string,
    opts: {
      stripeSubscriptionId?: string;
      startsAt?: Date;
      endsAt?: Date;
      autoRenew?: boolean;
      durationDays?: number;
    },
  ): Promise<Subscription> {
    const current = await this.getActiveSubscription(userId);

    if (current) {
      current.status = SubscriptionStatus.CANCELED;
      current.canceledAt = new Date();
      await this.subscriptionsRepository.save(current);
    }

    const startsAt = opts.startsAt ?? new Date();
    const endsAt =
      opts.endsAt ??
      new Date(startsAt.getTime() + (opts.durationDays ?? 30) * 86_400_000);

    const subscription = this.subscriptionsRepository.create({
      userId,
      planId,
      previousPlanId: current?.planId ?? null,
      status: SubscriptionStatus.ACTIVE,
      startsAt,
      endsAt,
      autoRenew: opts.autoRenew ?? true,
      stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
    });
    const saved = await this.subscriptionsRepository.save(subscription);
    saved.plan = await this.plansRepository.findOneOrFail({
      where: { id: planId },
    });

    await this.getOrCreateCurrentUsageCounter(userId, saved.id);
    return saved;
  }

  private async ensureStripeCustomer(user: User): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripeService.client.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { userId: user.id },
    });

    user.stripeCustomerId = customer.id;
    await this.usersRepository.save(user);
    return customer.id;
  }

  private async getOrCreateCurrentUsageCounter(
    userId: string,
    subscriptionId: string,
  ): Promise<UsageCounter> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodStartStr = periodStart.toISOString().slice(0, 10);
    const periodEndStr = periodEnd.toISOString().slice(0, 10);

    let counter = await this.usageRepository.findOne({
      where: {
        userId,
        periodStart: LessThanOrEqual(periodStartStr) as unknown as string,
        periodEnd: MoreThanOrEqual(periodEndStr) as unknown as string,
      },
    });

    if (!counter) {
      counter = this.usageRepository.create({
        userId,
        subscriptionId,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
      });
      counter = await this.usageRepository.save(counter);
    }

    return counter;
  }

  private mapStripeStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
      case 'unpaid':
      case 'incomplete':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      default:
        return SubscriptionStatus.EXPIRED;
    }
  }

  private toStatusResponse(subscription: Subscription) {
    return {
      plan: {
        code: subscription.plan.code,
        name: subscription.plan.name,
        tier: subscription.plan.tier,
        priceCents: subscription.plan.priceCents,
        currency: subscription.plan.currency,
      },
      status: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      autoRenew: subscription.autoRenew,
      canceledAt: subscription.canceledAt ?? null,
    };
  }

  async incrementChatUsage(userId: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) return;
    const counter = await this.getOrCreateCurrentUsageCounter(
      userId,
      subscription.id,
    );
    await this.usageRepository.increment(
      { id: counter.id },
      'chatRequestsUsed',
      1,
    );
  }

  async incrementSearchUsage(userId: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) return;
    const counter = await this.getOrCreateCurrentUsageCounter(
      userId,
      subscription.id,
    );
    await this.usageRepository.increment(
      { id: counter.id },
      'searchRequestsUsed',
      1,
    );
  }
}
