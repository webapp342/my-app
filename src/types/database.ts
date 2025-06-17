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
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Wallet = Database['public']['Tables']['wallets']['Row'] 