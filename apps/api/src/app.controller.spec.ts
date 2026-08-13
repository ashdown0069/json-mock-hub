import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { CommonService } from './common/common.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: CommonService,
          useValue: {},
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health check status', async () => {
      const result = await appController.healthCheck();
      expect(result.status).toBe('ok');
    });
  });
});
