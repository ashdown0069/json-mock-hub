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
      const membership = await this.apiKeyService.verify(
        workspaceId,
        Array.isArray(apiKey) ? apiKey[0] : apiKey,
      );

      request.user = {
        // 키 주인 본인을 주체로 둔다. 예전에는 workspace.owner를 대행 주체로 써서
        // 누구의 키든 owner 권한으로 동작했고, canCreate/canDelete 등 세분 권한이
        // MCP 경로에서 전부 무의미했다.
        // user는 populate하지 않으면 ObjectId이므로 String()으로 감싼다.
        sub: String(membership.user),
        viaApiKey: true,
        // 이 키가 어느 워크스페이스로 발급됐는지 기록해 WorkspacePermissionGuard가 대조한다
        apiKeyWorkspaceId: workspaceId,
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
