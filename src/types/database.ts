export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          created_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          network: string
          address: string
          private_key_encrypted: string
          second_private_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          network: string
          address: string
          private_key_encrypted: string
          second_private_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          network?: string
          address?: string
          private_key_encrypted?: string
          second_private_key?: string | null
          created_at?: string
        }
      }
      user_transactions: {
        Row: {
          id: string
          user_id: string
          wallet_address: string
          transaction_hash: string
          transaction_type: 'deposit' | 'token_in' | 'withdraw' | 'token_out'
          amount: string
          token_symbol: string
          token_address: string | null
          network: string
          block_number: number | null
          transaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_address: string
          transaction_hash: string
          transaction_type: 'deposit' | 'token_in' | 'withdraw' | 'token_out'
          amount: string
          token_symbol: string
          token_address?: string | null
          network?: string
          block_number?: number | null
          transaction_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_address?: string
          transaction_hash?: string
          transaction_type?: 'deposit' | 'token_in' | 'withdraw' | 'token_out'
          amount?: string
          token_symbol?: string
          token_address?: string | null
          network?: string
          block_number?: number | null
          transaction_date?: string
          created_at?: string
        }
      }
      user_balances: {
        Row: {
          id: string
          user_id: string
          wallet_address: string
          token_symbol: string
          token_address: string | null
          network: string
          balance: string
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_address: string
          token_symbol: string
          token_address?: string | null
          network?: string
          balance?: string
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_address?: string
          token_symbol?: string
          token_address?: string | null
          network?: string
          balance?: string
          last_updated?: string
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type UserTransaction = Database['public']['Tables']['user_transactions']['Row']
export type UserBalance = Database['public']['Tables']['user_balances']['Row'] 