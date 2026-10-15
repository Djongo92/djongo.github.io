// parseSSEText must mirror the web's streamSSE.ts framing rules — the two
// clients read the same workshop streams.
import { describe, it, expect } from 'vitest';
import { parseSSEText } from './sse';

const chunk = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`;

describe('parseSSEText', () => {
  it('concatenates delta content and stops at [DONE]', () => {
    const body = [chunk('Hello, '), chunk('counsel.'), 'data: [DONE]', chunk('ignored after done')].join('\n');
    expect(parseSSEText(body)).toBe('Hello, counsel.');
  });

  it('skips keepalives, comments, and malformed lines without dropping later content', () => {
    const body = [
      ': keepalive',
      '',
      'event: message',
      'data: {partial json',
      chunk('still works'),
      'data: [DONE]',
    ].join('\n');
    expect(parseSSEText(body)).toBe('still works');
  });

  it('tolerates CRLF line endings', () => {
    const body = `${chunk('a')}\r\n${chunk('b')}\r\ndata: [DONE]\r\n`;
    expect(parseSSEText(body)).toBe('ab');
  });

  it('ignores delta frames without string content', () => {
    const body = [
      'data: {"choices":[{"delta":{}}]}',
      chunk('x'),
      'data: [DONE]',
    ].join('\n');
    expect(parseSSEText(body)).toBe('x');
  });

  it('returns an empty string when the body carries no data lines', () => {
    expect(parseSSEText('plain text, not a stream')).toBe('');
  });
});
