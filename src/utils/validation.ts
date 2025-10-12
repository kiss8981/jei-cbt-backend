import { ValidationError } from 'class-validator';

export function collectMessages(
  errors: ValidationError[],
  path = '',
): string[] {
  const msgs: string[] = [];

  for (const e of errors) {
    const key = path ? `${path}.${e.property}` : e.property;

    // 1) 현재 노드의 constraints 수집
    if (e.constraints) {
      msgs.push(...Object.values(e.constraints).map((m) => `${key}: ${m}`));
    }

    // 2) 자식 노드 재귀 탐색 (배열이면 property가 "0","1"처럼 들어옵니다)
    if (e.children && e.children.length > 0) {
      // 배열 요소인 경우 e.value가 배열이면 index 힌트를 붙여주면 더 읽기 좋음
      const isArrayIndex = /^\d+$/.test(e.property);
      const nextPath = isArrayIndex
        ? `${path}[${e.property}]` // ex) answersForMultipleChoice[0]
        : key || path;

      msgs.push(...collectMessages(e.children, nextPath));
    }
  }

  return msgs;
}
