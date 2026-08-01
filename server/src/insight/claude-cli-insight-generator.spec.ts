import { execFile } from 'node:child_process';
import { BadGatewayException } from '@nestjs/common';
import { ClaudeCliInsightGenerator } from './claude-cli-insight-generator';

jest.mock('node:child_process');

const mockExecFile = execFile as unknown as jest.Mock;

function mockCliStdout(stdout: string) {
  mockExecFile.mockImplementation((_cmd, _args, _options, callback) => {
    callback(null, stdout, '');
  });
}

function mockCliError(error: Error) {
  mockExecFile.mockImplementation((_cmd, _args, _options, callback) => {
    callback(error, '', '');
  });
}

describe('ClaudeCliInsightGenerator', () => {
  let generator: ClaudeCliInsightGenerator;
  const logs = [{ learnedNote: '배운 것', troubleshootingNote: null, tomorrowTask: null, tags: [] }];

  beforeEach(() => {
    generator = new ClaudeCliInsightGenerator();
    mockExecFile.mockReset();
  });

  it('is_error가 false고 structured_output이 스키마에 맞으면 summary/patterns를 반환한다', async () => {
    mockCliStdout(
      JSON.stringify({
        is_error: false,
        structured_output: { summary: '요약', patterns: ['패턴1', '패턴2'] },
      }),
    );

    const result = await generator.generate({ logs });

    expect(result).toEqual({ summary: '요약', patterns: ['패턴1', '패턴2'] });
  });

  it('CLI 프로세스가 에러로 종료하면 BadGatewayException을 던진다', async () => {
    mockCliError(new Error('command not found'));

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });

  it('is_error가 true면 BadGatewayException을 던진다', async () => {
    mockCliStdout(JSON.stringify({ is_error: true }));

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });

  it('structured_output이 스키마와 다르면 BadGatewayException을 던진다', async () => {
    mockCliStdout(JSON.stringify({ is_error: false, structured_output: { summary: 123 } }));

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });

  it('stdout이 JSON이 아니면 BadGatewayException을 던진다', async () => {
    mockCliStdout('not json');

    await expect(generator.generate({ logs })).rejects.toThrow(BadGatewayException);
  });
});
