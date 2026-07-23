import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CommonService } from './common.service';

describe('CommonService', () => {
  let service: CommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // CommonService는 HttpService를 주입받으므로 스모크 테스트에선 목으로 대체한다
      providers: [
        { provide: HttpService, useValue: { axiosRef: { post: jest.fn() } } },
        CommonService,
      ],
    }).compile();

    service = module.get<CommonService>(CommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
