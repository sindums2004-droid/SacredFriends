import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { repository } from '../storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const V1_INSTALLER_PATH = path.resolve(__dirname, '../../public/downloads/SacredFriends-V1-Free-Setup.exe');
const V2_PRIVATE_INSTALLER_PATH = path.resolve(__dirname, '../private_downloads/SacredFriends-V2-Paid-Setup.exe');

export async function getPublicConfig(req, res) {
  try {
    const config = await repository.getConfig();
    const v1Available = fs.existsSync(V1_INSTALLER_PATH);
    const v2Available = fs.existsSync(V2_PRIVATE_INSTALLER_PATH);

    return res.status(200).json({
      product: 'Sacred Friends',
      company: 'Q-CUBIC',
      tagline: 'Ideas. People. Real Impact.',
      slogan: 'Small Ideas Build Big Things.',
      v1: {
        name: 'Sacred Friends V1 – Free',
        filename: 'SacredFriends-V1-Free-Setup.exe',
        isAvailable: v1Available,
        downloadUrl: '/api/download/v1'
      },
      v2: {
        name: 'Sacred Friends V2 – Premium',
        filename: 'SacredFriends-V2-Paid-Setup.exe',
        isAvailable: v2Available,
        price: config.v2Price,
        currency: config.currency,
        isPriceConfigured: config.priceConfigured,
        gateway: 'YouPI-PG',
        checkoutPortalUrl: process.env.YOUPI_CHECKOUT_URL || 'http://localhost:7000'
      }
    });
  } catch (error) {
    console.error('[Config] Exception:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve configuration.'
    });
  }
}

export async function adminUpdatePrice(req, res) {
  try {
    const { price, currency, adminSecretKey } = req.body;
    const requiredSecret = process.env.ADMIN_SECRET_KEY || 'sacred-friends-super-admin-secret-2026';

    if (!adminSecretKey || adminSecretKey !== requiredSecret) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const updated = await repository.setPrice(price !== undefined ? Number(price) : null, currency || 'INR');
    return res.status(200).json({
      success: true,
      message: 'Price configuration updated successfully.',
      config: updated
    });
  } catch (error) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: error.message });
  }
}

