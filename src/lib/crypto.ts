import { ethers } from 'ethers'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// AES encryption key - in production this should be from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-for-encryption!'
const ALGORITHM = 'aes-256-cbc'

// Generate a new random wallet using Ethers.js v6
export function createRandomWallet(): ethers.HDNodeWallet {
  return ethers.Wallet.createRandom()
}

// Generate a unique second private key (for backup/alternative access)
export function generateSecondPrivateKey(): string {
  // Create a completely random 64-character hex string
  const randomBytes = ethers.randomBytes(32)
  return ethers.hexlify(randomBytes)
}

// Reconstruct wallet from private key
export function walletFromPrivateKey(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey)
}

// Simple encryption for demo purposes (in production, use proper AES encryption)
export async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  const combined = `${privateKey}:${password}`
  return bcrypt.hash(combined, salt)
}

// AES Encryption for private keys
export function encrypt(text: string): string {
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

// AES Decryption for private keys
export function decrypt(encryptedData: string): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// For demo purposes, we'll store private keys with basic encoding
// In production, implement proper AES encryption/decryption
export function encodePrivateKey(privateKey: string): string {
  return Buffer.from(privateKey).toString('base64')
}

export function decodePrivateKey(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString()
}

// Hash password for storage
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
} 