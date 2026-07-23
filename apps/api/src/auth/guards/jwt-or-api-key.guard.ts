import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyService } from '../../workspaces/api-key.service';
import { Observable, lastValueFrom } from 'rxjs';

@Injectable()
export class JwtOrApiKeyGuard extends JwtAuthGuard {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (apiKey) {
      const workspaceId = request.params.workspaceId;
      const workspace = await this.apiKeyService.verify(
        workspaceId,
        Array.isArray(apiKey) ? apiKey[0] : apiKey,
      );

      request.user = {
        sub: workspace.owner.toString(),
        viaApiKey: true,
      };
      return true;
    }

    const result = super.canActivate(context);
    if (result instanceof Promise) {
      return await result;
    }
    if (result instanceof Observable) {
      return await lastValueFrom(result);
    }
    return result;
  }
}
