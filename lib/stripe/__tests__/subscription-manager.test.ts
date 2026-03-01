import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock functions – available before vi.mock factory functions execute
// ---------------------------------------------------------------------------
const mockStripeCustomersCreate = vi.hoisted(() => vi.fn());
const mockPrismaUserUpdate = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());
const mockPrismaUserFindFirst = vi.hoisted(() => vi.fn());
const mockPrismaInstanceCount = vi.hoisted(() => vi.fn());
const mockPrismaInstanceUpdateMany = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/stripe/stripe-server', () => ({
  stripe: {
    customers: { create: mockStripeCustomersCreate },
  },
  PRICE_IDS: {
    STARTER: 'price_starter',
    PROFESSIONAL: 'price_professional',
    ENTERPRISE: 'price_enterprise',
  },
}));

vi.mock('@/lib/database', () => ({
  prisma: {
    user: {
      update: mockPrismaUserUpdate,
      findUnique: mockPrismaUserFindUnique,
      findFirst: mockPrismaUserFindFirst,
    },
    instance: {
      count: mockPrismaInstanceCount,
      updateMany: mockPrismaInstanceUpdateMany,
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports under test (must come after vi.mock)
// ---------------------------------------------------------------------------
import {
  isS3StateConfig,
  isNamedError,
  getErrorMessage,
  INSTANCE_LIMITS,
  SubscriptionManager,
} from '../subscription-manager';

// ---------------------------------------------------------------------------
// Helper function tests
// ---------------------------------------------------------------------------
describe('isS3StateConfig', () => {
  it('returns true for objects with a bucket property', () => {
    const s3Config = { bucket: 'my-bucket', key: 'state.tfstate', region: 'us-east-1', encrypt: true, dynamodb_table: 'locks' };
    expect(isS3StateConfig(s3Config)).toBe(true);
  });

  it('returns false for objects without a bucket property', () => {
    const localConfig = { path: '/tmp/state.tfstate' };
    expect(isS3StateConfig(localConfig as never)).toBe(false);
  });
});

describe('isNamedError', () => {
  it('returns true for an object with a name property', () => {
    expect(isNamedError({ name: 'TypeError' })).toBe(true);
  });

  it('returns true for an Error instance (which has name)', () => {
    expect(isNamedError(new Error('boom'))).toBe(true);
  });

  it('returns false for null', () => {
    expect(isNamedError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNamedError(undefined)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isNamedError('some string')).toBe(false);
  });

  it('returns false for a plain object without name', () => {
    expect(isNamedError({ message: 'oops' })).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('returns the message from an Error instance', () => {
    expect(getErrorMessage(new Error('something broke'))).toBe('something broke');
  });

  it('returns the string directly when given a string', () => {
    expect(getErrorMessage('raw error string')).toBe('raw error string');
  });

  it('returns the message property from a plain object', () => {
    expect(getErrorMessage({ message: 'object error' })).toBe('object error');
  });

  it('returns empty string when object message is undefined', () => {
    expect(getErrorMessage({ message: undefined })).toBe('');
  });

  it('returns "Unknown error occurred" for null', () => {
    expect(getErrorMessage(null)).toBe('Unknown error occurred');
  });

  it('returns "Unknown error occurred" for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
  });

  it('returns "Unknown error occurred" for a number', () => {
    expect(getErrorMessage(42)).toBe('Unknown error occurred');
  });
});

// ---------------------------------------------------------------------------
// INSTANCE_LIMITS constant
// ---------------------------------------------------------------------------
describe('INSTANCE_LIMITS', () => {
  it('FREE allows 1 instance', () => {
    expect(INSTANCE_LIMITS.FREE).toBe(1);
  });

  it('STARTER allows 3 instances', () => {
    expect(INSTANCE_LIMITS.STARTER).toBe(3);
  });

  it('PROFESSIONAL allows 10 instances', () => {
    expect(INSTANCE_LIMITS.PROFESSIONAL).toBe(10);
  });

  it('ENTERPRISE allows unlimited instances (-1)', () => {
    expect(INSTANCE_LIMITS.ENTERPRISE).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// SubscriptionManager class
// ---------------------------------------------------------------------------
describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SubscriptionManager();
  });

  // -----------------------------------------------------------------------
  // canCreateInstance
  // -----------------------------------------------------------------------
  describe('canCreateInstance', () => {
    it('returns false when user does not exist', async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const result = await manager.canCreateInstance('non-existent-user');

      expect(result).toBe(false);
      expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({ where: { id: 'non-existent-user' } });
    });

    it('returns true for a free user (no subscription) with 0 instances', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: null,
      });
      mockPrismaInstanceCount.mockResolvedValue(0);

      const result = await manager.canCreateInstance('user-1');

      expect(result).toBe(true);
    });

    it('returns false for a free user (no subscription) with 1 instance', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: null,
      });
      mockPrismaInstanceCount.mockResolvedValue(1);

      const result = await manager.canCreateInstance('user-1');

      expect(result).toBe(false);
    });

    it('returns false for a user with inactive subscription and 1 instance', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { status: 'CANCELED', instanceLimit: 3 },
      });
      mockPrismaInstanceCount.mockResolvedValue(1);

      const result = await manager.canCreateInstance('user-1');

      expect(result).toBe(false);
    });

    it('returns true for a STARTER user with 2 instances (under limit of 3)', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { status: 'ACTIVE', instanceLimit: 3, plan: 'STARTER' },
      });
      mockPrismaInstanceCount.mockResolvedValue(2);

      const result = await manager.canCreateInstance('user-1');

      expect(result).toBe(true);
    });

    it('returns false for a STARTER user with 3 instances (at limit)', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { status: 'ACTIVE', instanceLimit: 3, plan: 'STARTER' },
      });
      mockPrismaInstanceCount.mockResolvedValue(3);

      const result = await manager.canCreateInstance('user-1');

      expect(result).toBe(false);
    });

    it('returns true for an ENTERPRISE user regardless of instance count (limit -1)', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { status: 'ACTIVE', instanceLimit: -1, plan: 'ENTERPRISE' },
      });
      mockPrismaInstanceCount.mockResolvedValue(100);

      const result = await manager.canCreateInstance('user-1');

      expect(result).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // createCustomer
  // -----------------------------------------------------------------------
  describe('createCustomer', () => {
    it('creates a Stripe customer with correct params and stores customer ID', async () => {
      const fakeCustomer = { id: 'cus_test123', email: 'test@example.com', name: 'Test User' };
      mockStripeCustomersCreate.mockResolvedValue(fakeCustomer);
      mockPrismaUserUpdate.mockResolvedValue({});

      const customer = await manager.createCustomer('user-1', 'test@example.com', 'Test User');

      expect(customer).toEqual(fakeCustomer);
      expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { userId: 'user-1' },
      });
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripeCustomerId: 'cus_test123' },
      });
    });

    it('passes undefined for name when not provided', async () => {
      const fakeCustomer = { id: 'cus_test456', email: 'noname@example.com' };
      mockStripeCustomersCreate.mockResolvedValue(fakeCustomer);
      mockPrismaUserUpdate.mockResolvedValue({});

      await manager.createCustomer('user-2', 'noname@example.com');

      expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
        email: 'noname@example.com',
        name: undefined,
        metadata: { userId: 'user-2' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // handleSubscriptionDeleted
  // -----------------------------------------------------------------------
  describe('handleSubscriptionDeleted', () => {
    it('finds user by subscription ID and sets status to CANCELED', async () => {
      const existingSubscription = {
        stripeSubscriptionId: 'sub_deleted',
        stripePriceId: 'price_starter',
        status: 'ACTIVE',
        plan: 'STARTER',
        instanceLimit: 3,
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
        canceledAt: null,
      };
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscription: existingSubscription,
      });
      mockPrismaUserUpdate.mockResolvedValue({});
      mockPrismaInstanceUpdateMany.mockResolvedValue({ count: 2 });

      await manager.handleSubscriptionDeleted('sub_deleted');

      expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({
        where: {
          subscription: {
            is: {
              stripeSubscriptionId: 'sub_deleted',
            },
          },
        },
      });
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: {
            subscription: {
              set: expect.objectContaining({
                ...existingSubscription,
                status: 'CANCELED',
                canceledAt: expect.any(Date),
              }),
            },
          },
        })
      );
    });

    it('stops all running instances for the user', async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscription: {
          stripeSubscriptionId: 'sub_deleted',
          status: 'ACTIVE',
          plan: 'STARTER',
          instanceLimit: 3,
          canceledAt: null,
        },
      });
      mockPrismaUserUpdate.mockResolvedValue({});
      mockPrismaInstanceUpdateMany.mockResolvedValue({ count: 2 });

      await manager.handleSubscriptionDeleted('sub_deleted');

      expect(mockPrismaInstanceUpdateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'RUNNING',
        },
        data: {
          status: 'STOPPED',
        },
      });
    });

    it('does nothing when no user is found for the subscription', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null);

      await manager.handleSubscriptionDeleted('sub_unknown');

      expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
      expect(mockPrismaInstanceUpdateMany).not.toHaveBeenCalled();
    });

    it('does nothing when user has no subscription object', async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        id: 'user-1',
        subscription: null,
      });

      await manager.handleSubscriptionDeleted('sub_unknown');

      expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
      expect(mockPrismaInstanceUpdateMany).not.toHaveBeenCalled();
    });
  });
});
