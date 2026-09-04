import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

// Authenticates public-API requests via an API key (Authorization: Bearer sk_…,
// or x-api-key). On success it attaches the owning user as req.user so the rest
// of the stack (per-user scoping, monitoring) works unchanged.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeys: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = String(req.headers['authorization'] || '');
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const raw = String(bearer || req.headers['x-api-key'] || '').trim();

    const resolved = await this.apiKeys.resolve(raw);
    if (!resolved) throw new UnauthorizedException('Invalid or missing API key');

    req.user = resolved.user;
    req.apiKey = resolved.apiKey;
    return true;
  }
}
