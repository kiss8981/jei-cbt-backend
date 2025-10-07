import { Transform } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';

/** "A,B" | ["A","B"] | A  -> string[] (trim + 빈값 제거) */
export const toArray = () =>
  Transform(({ value }) => {
    if (value == null) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const items: string[] = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [value];

    const result: string[] = items
      .map((v) => String(v))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return result; // string[] (no-unsafe-return X)
  });

/** enum 배열 변환 + 검증: "A,B" | ["A","B"] | A -> E[] */
export const toEnumArray = <E extends Record<string, string | number>>(e: E) =>
  Transform(({ value }) => {
    if (value == null || value === '') return undefined;

    // 입력 표준화
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const items: string[] = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [value];

    // enum 이름(키)와 값 집합 준비
    // 숫자 enum의 리버스 매핑 때문에 "1","2" 같은 키가 생기므로 숫자 키는 제외
    const nameKeys = Object.keys(e).filter((k) => Number.isNaN(Number(k)));
    const nameSet = new Set(nameKeys.map((k) => k)); // 대소문자 구분 유지 (필요하면 .toUpperCase()로 통일)

    const valueSet = new Set(Object.values(e)); // 숫자/문자열 값 모두 포함

    const out = items.map((raw) => {
      const s = String(raw).trim();

      // 1) 값이 문자열 enum 값과 일치
      if (valueSet.has(s)) return s as E[keyof E];

      // 2) 값이 숫자(enum 숫자 값)로 해석 가능하고 일치
      const n = Number(s);
      if (!Number.isNaN(n) && valueSet.has(n)) return n as E[keyof E];

      // 3) 값이 enum 이름(키)인 경우 -> 실제 enum 값으로 치환
      if (nameSet.has(s)) return (e as any)[s] as E[keyof E];

      // 전부 아니면 오류
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    });

    return out;
  });
