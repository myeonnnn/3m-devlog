import { beforeEach, describe, expect, it } from 'vitest';
import { guestStorage } from '../guest-storage';

describe('guestStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('로그를 생성하면 목록에서 다시 조회된다', () => {
    const created = guestStorage.create({ logDate: '2026-07-30', learnedNote: '배운 것' });
    expect(guestStorage.list()).toEqual([created]);
  });

  it('태그를 대소문자 무관하게 중복 제거하고, 처음 등장한 표기를 그대로 유지한다', () => {
    const created = guestStorage.create({
      logDate: '2026-07-30',
      learnedNote: '배운 것',
      tags: ['#React', 'react', 'REACT', 'testing'],
    });
    expect(created.tags).toEqual(['React', 'testing']);
  });

  it('list()가 태그로 대소문자 구분 없이 필터링한다', () => {
    guestStorage.create({ logDate: '2026-07-30', learnedNote: 'A', tags: ['react'] });
    guestStorage.create({ logDate: '2026-07-29', learnedNote: 'B', tags: ['vue'] });
    const filtered = guestStorage.list({ tag: 'REACT' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].learnedNote).toBe('A');
  });

  it('list()가 검색어로 노트 필드 전체를 검색한다', () => {
    guestStorage.create({ logDate: '2026-07-30', learnedNote: 'hooks 배우기' });
    guestStorage.create({ logDate: '2026-07-29', learnedNote: '다른 내용', troubleshootingNote: 'hooks 버그' });
    guestStorage.create({ logDate: '2026-07-28', learnedNote: '전혀 무관' });
    expect(guestStorage.list({ search: 'hooks' })).toHaveLength(2);
  });

  it('list()가 작성일 기준 최신순으로 정렬한다', () => {
    guestStorage.create({ logDate: '2026-07-01', learnedNote: 'old' });
    guestStorage.create({ logDate: '2026-07-30', learnedNote: 'new' });
    const [first, second] = guestStorage.list();
    expect(first.learnedNote).toBe('new');
    expect(second.learnedNote).toBe('old');
  });

  it('존재하지 않는 id로 update()하면 에러를 던진다', () => {
    expect(() => guestStorage.update('nonexistent', { learnedNote: 'x' })).toThrow(
      '게스트 로그를 찾을 수 없어요.',
    );
  });

  it('존재하지 않는 id로 remove()해도 에러 없이 무시한다', () => {
    expect(() => guestStorage.remove('nonexistent')).not.toThrow();
  });

  it('popularTags()가 태그를 대소문자 무관하게 집계하고 개수 내림차순으로 정렬한다', () => {
    guestStorage.create({ logDate: '2026-07-30', learnedNote: 'A', tags: ['react'] });
    guestStorage.create({ logDate: '2026-07-29', learnedNote: 'B', tags: ['React', 'vue'] });
    const tags = guestStorage.popularTags();
    expect(tags[0]).toEqual({ tag: 'react', count: 2 });
    expect(tags[1]).toEqual({ tag: 'vue', count: 1 });
  });
});
