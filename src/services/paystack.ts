/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/lib/api';

export interface PaystackConfig {
  publicKey?: string; // Optional - will use env var if not provided
  email: string;
  amount: number; // Amount in kobo (multiply by 100)
  reference?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money')[];
  onSuccess?: (response: PaystackResponse) => void;
  onClose?: () => void;
}

export interface PaystackResponse {
  reference: string;
  status: 'success' | 'failed';
  message: string;
  trans: string;
  transaction: string;
  trxref: string;
}

export interface PaymentRecord {
  id: string;
  reference: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  paymentMethod: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  transactionId?: string;
  createdAt: Date;
  paidAt?: Date;
}

/**
 * Paystack Payment Service
 * Handles all payment-related operations with Paystack gateway
 */
class PaystackService {
  private publicKey: string;
  private scriptLoaded: boolean = false;

  constructor() {
    this.publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
  }

  /**
   * Load Paystack inline script
   */
  private loadScript(): Promise<void> {
    if (this.scriptLoaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Paystack script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Generate unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `RF-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Convert amount to kobo (Paystack requires amount in lowest currency unit)
   */
  private toKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Initialize Paystack payment
   */
  async initializePayment(config: PaystackConfig): Promise<void> {
    try {
      // Load Paystack script if not loaded
      await this.loadScript();

      // Ensure window.PaystackPop is available
      if (typeof window.PaystackPop === 'undefined') {
        throw new Error('Paystack script not loaded properly');
      }

      const reference = config.reference || this.generateReference();
      const amount = this.toKobo(config.amount);
      const publicKey = config.publicKey || this.publicKey;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: config.email,
        amount,
        currency: config.currency || 'NGN',
        ref: reference,
        channels: config.channels,
        metadata: {
          ...config.metadata,
          custom_fields: [
            {
              display_name: 'Payment Type',
              variable_name: 'payment_type',
              value: config.metadata?.paymentType || 'rent',
            },
          ],
        },
        callback: (response: PaystackResponse) => {
          config.onSuccess?.(response);
        },
        onClose: () => {
          config.onClose?.();
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization error:', error);
      throw error;
    }
  }

  /**
   * Verify payment on backend
   */
  async verifyPayment(reference: string): Promise<PaymentRecord> {
    try {
      const response = await api.get(`/payments/verify/${reference}`);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Payment verification failed');
      }

      return response.data;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string, userType: 'tenant' | 'landlord'): Promise<PaymentRecord[]> {
    try {
      const endpoint = userType === 'tenant' 
        ? `/payments/tenant/${userId}` 
        : `/payments/landlord/${userId}`;
      
      const response = await api.get(endpoint);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch payment history');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Initiate refund
   */
  async initiateRefund(transactionId: string, amount?: number): Promise<void> {
    try {
      const response = await api.post('/payments/refund', {
        transactionId,
        amount: amount ? this.toKobo(amount) : undefined,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Refund initiation failed');
      }
    } catch (error) {
      console.error('Refund error:', error);
      throw error;
    }
  }

  /**
   * Setup recurring payment (subscription)
   */
  async setupRecurringPayment(config: {
    email: string;
    amount: number;
    interval: 'monthly' | 'yearly';
    startDate?: Date;
  }): Promise<{ subscriptionCode: string; emailToken: string }> {
    try {
      const response = await api.post('/payments/subscription', {
        email: config.email,
        amount: this.toKobo(config.amount),
        interval: config.interval,
        startDate: config.startDate?.toISOString(),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to setup recurring payment');
      }

      return response.data;
    } catch (error) {
      console.error('Recurring payment setup error:', error);
      throw error;
    }
  }

  /**
   * Cancel recurring payment
   */
  async cancelRecurringPayment(subscriptionCode: string): Promise<void> {
    try {
      const response = await api.post('/payments/subscription/cancel', {
        subscriptionCode,
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(landlordId: string, period?: '7d' | '30d' | '90d' | '1y'): Promise<{
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;
    collectionRate: number;
    paymentCount: number;
  }> {
    try {
      const response = await api.get(`/payments/stats/${landlordId}`, {
        params: { period },
      } as any);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch payment stats');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      throw error;
    }
  }

  /**
   * Download payment receipt
   */
  async downloadReceipt(paymentId: string): Promise<Blob> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payments/receipt/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      return await response.blob();
    } catch (error) {
      console.error('Receipt download error:', error);
      throw error;
    }
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string | null {
    try {
      const stored = localStorage.getItem('rentflow_auth');
      if (stored) {
        const { token } = JSON.parse(stored);
        return token;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return null;
  }
}

// Export singleton instance
export const paystackService = new PaystackService();

// TypeScript declaration for Paystack
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: unknown) => {
        openIframe: () => void;
      };
    };
  }
}
