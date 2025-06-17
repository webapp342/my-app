import { ethers } from 'ethers'
import bcrypt from 'bcryptjs'

// Generate a new random wallet using Ethers.js v6
export function createRandomWallet(): ethers.HDNodeWallet {
  return ethers.Wallet.createRandom()
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