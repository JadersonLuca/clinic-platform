import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, salt, hash] = storedHash.split(':');

    if (algorithm !== 'scrypt' || !salt || !hash) {
      return false;
    }

    const storedKey = Buffer.from(hash, 'hex');
    const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;

    return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
  }
}
