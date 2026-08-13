import { model, Types } from 'mongoose';
import { FileBrowserItemSchema } from './file-browser-item.schema';

// DB 연결 없이 스키마 캐스팅 동작만 검증한다.
// 모델명은 다른 spec과 충돌하지 않도록 이 파일 전용 이름을 사용한다.
const TestItemModel = model('FileBrowserItemCastSpec', FileBrowserItemSchema);

const FULL_OPTIONS = {
  pagination: true,
  paginationParams: { pageParam: 'page', limitParam: 'limit' },
  sort: true,
  sortParams: { sortParam: '_sort', orderParam: '_order' },
  search: true,
  searchParams: { searchParam: 'keyword' },
};

const baseDoc = () => ({
  workspace: new Types.ObjectId(),
  name: 'users',
  itemType: 'File' as const,
});

describe('FileBrowserItemSchema의 options 캐스팅', () => {
  it('생성 시 정렬·검색 설정이 유실 없이 보존된다', () => {
    const doc = new TestItemModel({ ...baseDoc(), options: FULL_OPTIONS });
    expect(doc.toObject().options).toEqual(FULL_OPTIONS);
  });

  it('수정 경로(options 재대입) 후에도 정렬·검색 설정이 보존된다', () => {
    const doc = new TestItemModel({
      ...baseDoc(),
      options: { pagination: false },
    });
    // 저장된 문서를 수정하는 상황을 재현한다
    doc.isNew = false;
    doc.unmarkModified('options');

    doc.options = {
      pagination: false,
      search: true,
      searchParams: { searchParam: 'keyword' },
    };

    expect(doc.toObject().options).toEqual({
      pagination: false,
      search: true,
      searchParams: { searchParam: 'keyword' },
    });
  });

  it('options 재대입이 변경 사항으로 추적되어 save() 대상이 된다', () => {
    const doc = new TestItemModel({
      ...baseDoc(),
      options: { pagination: false },
    });
    doc.isNew = false;
    doc.unmarkModified('options');

    doc.options = { pagination: false, sort: true };

    expect(doc.isModified('options')).toBe(true);
  });

  it('options를 지정하지 않으면 기본값 null이다', () => {
    const doc = new TestItemModel(baseDoc());
    expect(doc.toObject().options).toBeNull();
  });

  it('options에 서브도큐먼트 _id를 주입하지 않는다', () => {
    const doc = new TestItemModel({ ...baseDoc(), options: FULL_OPTIONS });
    expect(doc.toObject().options).not.toHaveProperty('_id');
  });
});
