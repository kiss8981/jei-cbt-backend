import { execFileSync } from 'child_process';
import { resolve } from 'path';

describe('NoticeService sanitize-html runtime compatibility', () => {
  it('loads sanitize-html in CommonJS and sanitizes notice content', () => {
    const projectRoot = resolve(__dirname, '../..');
    const script = `
      const { NoticeService } = require('./src/notice/notice.service');
      const service = new NoticeService({}, {}, {});
      const input = '<p onclick="alert(1)"><strong>정상</strong><script>alert(1)</script></p>';
      const output = service.sanitize(input);

      if (output !== '<p><strong>정상</strong></p>') {
        throw new Error('Unexpected sanitized HTML: ' + output);
      }

      process.stdout.write(output);
    `;

    const output = execFileSync(
      process.execPath,
      [
        '-r',
        'ts-node/register',
        '-r',
        'tsconfig-paths/register',
        '-e',
        script,
      ],
      {
        cwd: projectRoot,
        encoding: 'utf8',
      },
    );

    expect(output).toBe('<p><strong>정상</strong></p>');
  });
});

