import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MockserverService } from './mockserver.service';
import { FileBrowserItem } from '../database/schema/file-browser-item.schema';

describe('MockserverService', () => {
  let service: MockserverService;
  let findOneMock: jest.Mock;

  beforeEach(async () => {
    findOneMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        MockserverService,
        {
          provide: getModelToken(FileBrowserItem.name),
          // findOne 모킹 정의
          useValue: { findOne: findOneMock },
        },
      ],
    }).compile();

    service = module.get(MockserverService);
  });

  it('정확 매칭된 파일의 JSON 배열을 반환한다 (GET 컬렉션)', async () => {
    const mockItem = {
      json: [{ id: 1 }, { id: 2 }],
      options: null,
    };
    findOneMock.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(mockItem) }),
    });

    const result = await service.resolveRequest(
      '683dea0000000000000000ab',
      '/api/users',
      'GET',
      {},
      null,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('매칭되는 파일이 없으면 NotFoundException을 던진다', async () => {
    findOneMock.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(null) }),
    });

    await expect(
      service.resolveRequest(
        '683dea0000000000000000ab',
        '/api/unknown',
        'GET',
        {},
        null,
      ),
    ).rejects.toThrow();
  });

  it('존재하지 않는 id에 대한 PUT 요청은 404를 반환한다 (GET과 일관성)', async () => {
    const mockItem = {
      json: [{ id: 1, name: 'kim' }],
      options: null,
    };
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(null) }), // 1차 조회 실패
    });
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(mockItem) }), // 2차 조회 성공 (부모)
    });

    const result = await service.resolveRequest(
      '683dea0000000000000000ab',
      '/users/999',
      'PUT',
      {},
      { name: 'lee' },
    );

    expect(result.status).toBe(404);
  });

  it('PUT 병합 응답은 저장된 id의 타입(숫자)을 보존한다', async () => {
    const mockItem = {
      json: [{ id: 1, name: 'kim' }],
      options: null,
    };
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(null) }), // 1차 정확매칭 실패
    });
    findOneMock.mockReturnValueOnce({
      lean: () => ({ exec: () => Promise.resolve(mockItem) }), // 2차 부모 매칭
    });

    const result = await service.resolveRequest(
      '683dea0000000000000000ab',
      '/users/1',
      'PUT',
      {},
      { name: 'lee' },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ id: 1, name: 'lee' });
    expect(typeof (result.body as any).id).toBe('number');
  });
});
