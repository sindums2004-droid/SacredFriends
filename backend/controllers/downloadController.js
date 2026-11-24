import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { repository } from '../storage/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const V1_INSTALLER_PATH = path.resolve(__dirname, '../../public/downloads/SacredFriends-V1-Free-Setup.exe');
const V2_PRIVATE_INSTALLER_PATH = path.resolve(__dirname, '../private_downloads/SacredFriends-V2-Paid-Setup.exe');

/**
 * V1 Free Download Handler
 * Verifies installer file exists before streaming
 */
export async function downloadV1(req, res) {
  try {
    if (!fs.existsSync(V1_INSTALLER_PATH)) {
      console.warn('[Download] V1 installer missing at:', V1_INSTALLER_PATH);
      return res.status(404).json({
        error: 'INSTALLER_UNAVAILABLE',
        message: 'The V1 installer is temporarily unavailable. Please try again later.'
      });
    }

    const stat = fs.statSync(V1_INSTALLER_PATH);
    const filename = 'SacredFriends-V1-Free-Setup.exe';

    res.writeHead(200, {
      'Content-Type': 'application/vnd.microsoft.portable-executable',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });

    const readStream = fs.createReadStream(V1_INSTALLER_PATH);
    readStream.on('error', (err) => {
      console.error('[Download] Stream error for V1:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'STREAM_ERROR',
          message: 'An interrupted download occurred. Please try again.'
        });
      }
    });

    readStream.pipe(res);
  } catch (error) {
    console.error('[Download] V1 download error:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Unable to process download request. Please check your internet connection and try again.'
    });
  }
}

/**
 * Check V1 installer status without downloading
 */
export async function checkV1Status(req, res) {
  const exists = fs.existsSync(V1_INSTALLER_PATH);
  if (!exists) {
    return res.status(404).json({
      available: false,
      message: 'The V1 installer is temporarily unavailable. Please try again later.'
    });
  }
  const stat = fs.statSync(V1_INSTALLER_PATH);
  return res.status(200).json({
    available: true,
    filename: 'SacredFriends-V1-Free-Setup.exe',
    sizeBytes: stat.size,
    sizeMB: (stat.size / (1024 * 1024)).toFixed(1) + ' MB'
  });
}

/**
 * V2 Premium Authorized Download Handler
 * Protected by short-lived cryptographic token and private file storage
 */
export async function downloadV2Authorized(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'A verified purchase token is required to download Sacred Friends V2 Premium.'
      });
    }

    // Verify token validity
    const verification = await repository.verifyAndConsumeDownloadToken(token.trim());

    if (!verification.valid) {
      if (verification.reason === 'TOKEN_EXPIRED') {
        return res.status(410).json({
          error: 'LINK_EXPIRED',
          message: 'This download link has expired. Please verify your purchase receipt or contact support for a fresh link.'
        });
      }
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Invalid or revoked download link. Access denied.'
      });
    }

    // Check private installer storage
    if (!fs.existsSync(V2_PRIVATE_INSTALLER_PATH)) {
      console.warn('[Download] Protected V2 installer missing at:', V2_PRIVATE_INSTALLER_PATH);
      return res.status(404).json({
        error: 'INSTALLER_UNAVAILABLE',
        message: 'Your payment is verified, but the installer is temporarily unavailable. Your purchase remains valid. Please try again later.'
      });
    }

    const stat = fs.statSync(V2_PRIVATE_INSTALLER_PATH);
    const filename = 'SacredFriends-V2-Paid-Setup.exe';

    console.log(`[Download] Serving authorized V2 installer for token ${token.substring(0, 12)}... (Size: ${(stat.size / (1024 * 1024)).toFixed(1)}MB)`);

    res.writeHead(200, {
      'Content-Type': 'application/vnd.microsoft.portable-executable',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache'
    });

    const readStream = fs.createReadStream(V2_PRIVATE_INSTALLER_PATH);
    readStream.on('error', (err) => {
      console.error('[Download] Stream error for V2:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'STREAM_ERROR',
          message: 'An interrupted download occurred. Please try again.'
        });
      }
    });

    readStream.pipe(res);
  } catch (error) {
    console.error('[Download] V2 download error:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Unable to stream Premium installer. Please try again.'
    });
  }
}

