/**
 * 仅用 UTF-8 解析 JSON / x-www-form-urlencoded，不经过 raw-body/iconv-lite，
 * 避免 pnpm 下 iconv-lite@0.7.x 缺少 encodings 导致启动或首请求 400。
 */
import type { Request, RequestHandler, Response, NextFunction } from 'express';
import * as qs from 'qs';
import * as querystring from 'querystring';

function contentType(req: Request): string {
  const raw = req.headers['content-type'];
  if (!raw) return '';
  return (Array.isArray(raw) ? raw[0] : raw).toLowerCase();
}

function readRawBody(req: Request, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        const err = new Error('request entity too large') as Error & { status: number };
        err.status = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function utf8JsonMiddleware(options: { limit: number }): RequestHandler {
  const { limit } = options;
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    const ct = contentType(req);
    if (!ct.includes('application/json')) {
      return next();
    }
    readRawBody(req, limit)
      .then((buf) => {
        if (buf.length === 0) {
          req.body = {};
          return next();
        }
        const text = buf.toString('utf8');
        try {
          req.body = JSON.parse(text) as Record<string, unknown>;
          return next();
        } catch {
          return res.status(400).json({
            code: 400,
            message: 'Invalid JSON',
            data: null,
          });
        }
      })
      .catch((err: Error & { status?: number }) => {
        if (err.status === 413) {
          return res.status(413).json({
            code: 413,
            message: err.message,
            data: null,
          });
        }
        return next(err);
      });
  };
}

export function utf8UrlencodedMiddleware(options: {
  limit: number;
  extended: boolean;
}): RequestHandler {
  const { limit, extended } = options;
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    const ct = contentType(req);
    if (!ct.includes('application/x-www-form-urlencoded')) {
      return next();
    }
    readRawBody(req, limit)
      .then((buf) => {
        const text = buf.length === 0 ? '' : buf.toString('utf8');
        req.body = extended
          ? qs.parse(text, { allowDots: true })
          : querystring.parse(text);
        return next();
      })
      .catch((err: Error & { status?: number }) => {
        if (err.status === 413) {
          return res.status(413).json({
            code: 413,
            message: err.message,
            data: null,
          });
        }
        return next(err);
      });
  };
}
