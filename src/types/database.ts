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
          private_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          network: string
          address: string
          private_key: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          network?: string
          address?: string
          private_key?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          tx_hash: string
          from_address: string
          to_address: string
          amount: number
          token_address: string | null
          token_symbol: string
          token_decimals: number
          network: string
          type: 'deposit' | 'withdraw'
          status: 'pending' | 'confirmed' | 'failed'
          block_number: number | null
          gas_used: number | null
          gas_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tx_hash: string
          from_address: string
          to_address: string
          amount: number
          token_address?: string | null
          token_symbol: string
          token_decimals?: number
          network?: string
          type: 'deposit' | 'withdraw'
          status?: 'pending' | 'confirmed' | 'failed'
          block_number?: number | null
          gas_used?: number | null
          gas_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tx_hash?: string
          from_address?: string
          to_address?: string
          amount?: number
          token_address?: string | null
          token_symbol?: string
          token_decimals?: number
          network?: string
          type?: 'deposit' | 'withdraw'
          status?: 'pending' | 'confirmed' | 'failed'
          block_number?: number | null
          gas_used?: number | null
          gas_price?: number | null
          created_at?: string
        }
      }
      balances: {
        Row: {
          id: string
          user_id: string
          token_symbol: string
          token_address: string | null
          amount: number
          network: string
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          token_symbol: string
          token_address?: string | null
          amount?: number
          network?: string
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          token_symbol?: string
          token_address?: string | null
          amount?: number
          network?: string
          last_updated?: string
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Balance = Database['public']['Tables']['balances']['Row'] 