export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          created_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          network: string;
          address: string;
          private_key_encrypted: string;
          second_private_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          network: string;
          address: string;
          private_key_encrypted: string;
          second_private_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          network?: string;
          address?: string;
          private_key_encrypted?: string;
          second_private_key?: string | null;
          created_at?: string;
        };
      };
      user_transactions: {
        Row: {
          id: string;
          user_id: string;
          wallet_address: string;
          transaction_hash: string;
          transaction_type: 'deposit' | 'token_in' | 'withdraw' | 'token_out';
          amount: string;
          token_symbol: string;
          token_address: string | null;
          network: string;
          block_number: number | null;
          transaction_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_address: string;
          transaction_hash: string;
          transaction_type: 'deposit' | 'token_in' | 'withdraw' | 'token_out';
          amount: string;
          token_symbol: string;
          token_address?: string | null;
          network?: string;
          block_number?: number | null;
          transaction_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wallet_address?: string;
          transaction_hash?: string;
          transaction_type?: 'deposit' | 'token_in' | 'withdraw' | 'token_out';
          amount?: string;
          token_symbol?: string;
          token_address?: string | null;
          network?: string;
          block_number?: number | null;
          transaction_date?: string;
          created_at?: string;
        };
      };
      user_balances: {
        Row: {
          id: string;
          user_id: string;
          wallet_address: string;
          token_symbol: string;
          token_address: string | null;
          network: string;
          balance: string;
          last_updated: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_address: string;
          token_symbol: string;
          token_address?: string | null;
          network?: string;
          balance?: string;
          last_updated?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wallet_address?: string;
          token_symbol?: string;
          token_address?: string | null;
          network?: string;
          balance?: string;
          last_updated?: string;
        };
      };
      user_asset_priorities: {
        Row: {
          id: string;
          user_id: string;
          token_symbol: string;
          priority_order: number;
          is_enabled: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_symbol: string;
          priority_order: number;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          token_symbol?: string;
          priority_order?: number;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      virtual_card_transactions: {
        Row: {
          id: string;
          card_id: string;
          user_id: string;
          transaction_type: 'PURCHASE' | 'REFUND' | 'LOAD' | 'WITHDRAWAL';
          amount: string;
          currency: string;
          merchant_name: string | null;
          merchant_category: string | null;
          description: string | null;
          status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
          transaction_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          user_id: string;
          transaction_type: 'PURCHASE' | 'REFUND' | 'LOAD' | 'WITHDRAWAL';
          amount: string;
          currency?: string;
          merchant_name?: string | null;
          merchant_category?: string | null;
          description?: string | null;
          status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
          transaction_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          user_id?: string;
          transaction_type?: 'PURCHASE' | 'REFUND' | 'LOAD' | 'WITHDRAWAL';
          amount?: string;
          currency?: string;
          merchant_name?: string | null;
          merchant_category?: string | null;
          description?: string | null;
          status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
          transaction_date?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type UserTransaction =
  Database['public']['Tables']['user_transactions']['Row'];
export type UserBalance = Database['public']['Tables']['user_balances']['Row'];
export type UserAssetPriority =
  Database['public']['Tables']['user_asset_priorities']['Row'];
export type VirtualCardTransaction =
  Database['public']['Tables']['virtual_card_transactions']['Row'];
