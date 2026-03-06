import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWorkflowProperties, type InputMethod } from '../analytics';

describe('buildWorkflowProperties', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('builds properties with all fields populated', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:30Z'));
    const pasteTime = new Date('2026-03-06T12:00:00Z').getTime(); // 30 seconds ago

    const result = buildWorkflowProperties({
      inputMethod: 'confluence_paste',
      bbcodeLength: 1500,
      imageCount: 3,
      lintErrorCount: 1,
      lintWarningCount: 2,
      pasteTimestamp: pasteTime,
      context: 'announcements',
      editedAfterPaste: true,
    });

    expect(result).toEqual({
      input_method: 'confluence_paste',
      content_length: 1500,
      image_count: 3,
      lint_error_count: 1,
      lint_warning_count: 2,
      seconds_since_paste: 30,
      context: 'announcements',
      edited_after_paste: true,
    });
  });

  it('returns null seconds_since_paste when no paste timestamp', () => {
    const result = buildWorkflowProperties({
      inputMethod: 'typed',
      bbcodeLength: 100,
      imageCount: 0,
      lintErrorCount: 0,
      lintWarningCount: 0,
      pasteTimestamp: null,
      context: 'guides',
      editedAfterPaste: false,
    });

    expect(result.seconds_since_paste).toBeNull();
  });

  it('rounds seconds_since_paste to whole seconds', () => {
    vi.setSystemTime(new Date('2026-03-06T12:00:07.800Z'));
    const pasteTime = new Date('2026-03-06T12:00:00Z').getTime(); // 7.8 seconds ago

    const result = buildWorkflowProperties({
      inputMethod: 'markdown_paste',
      bbcodeLength: 500,
      imageCount: 0,
      lintErrorCount: 0,
      lintWarningCount: 0,
      pasteTimestamp: pasteTime,
      context: 'forums',
      editedAfterPaste: false,
    });

    expect(result.seconds_since_paste).toBe(8);
  });

  it('handles zero-length content', () => {
    const result = buildWorkflowProperties({
      inputMethod: 'unknown',
      bbcodeLength: 0,
      imageCount: 0,
      lintErrorCount: 0,
      lintWarningCount: 0,
      pasteTimestamp: null,
      context: 'announcements',
      editedAfterPaste: false,
    });

    expect(result.content_length).toBe(0);
    expect(result.image_count).toBe(0);
  });

  it('preserves each input method type', () => {
    const methods: InputMethod[] = [
      'confluence_paste',
      'plaintext_paste',
      'markdown_paste',
      'file_open',
      'typed',
      'unknown',
    ];

    for (const method of methods) {
      const result = buildWorkflowProperties({
        inputMethod: method,
        bbcodeLength: 100,
        imageCount: 0,
        lintErrorCount: 0,
        lintWarningCount: 0,
        pasteTimestamp: null,
        context: 'announcements',
        editedAfterPaste: false,
      });
      expect(result.input_method).toBe(method);
    }
  });

  it('tracks edited_after_paste correctly', () => {
    const notEdited = buildWorkflowProperties({
      inputMethod: 'confluence_paste',
      bbcodeLength: 100,
      imageCount: 0,
      lintErrorCount: 0,
      lintWarningCount: 0,
      pasteTimestamp: Date.now(),
      context: 'announcements',
      editedAfterPaste: false,
    });
    expect(notEdited.edited_after_paste).toBe(false);

    const edited = buildWorkflowProperties({
      inputMethod: 'confluence_paste',
      bbcodeLength: 100,
      imageCount: 0,
      lintErrorCount: 0,
      lintWarningCount: 0,
      pasteTimestamp: Date.now(),
      context: 'announcements',
      editedAfterPaste: true,
    });
    expect(edited.edited_after_paste).toBe(true);
  });

  it('includes lint counts in output', () => {
    const result = buildWorkflowProperties({
      inputMethod: 'file_open',
      bbcodeLength: 2000,
      imageCount: 5,
      lintErrorCount: 3,
      lintWarningCount: 7,
      pasteTimestamp: Date.now(),
      context: 'reviews',
      editedAfterPaste: true,
    });

    expect(result.lint_error_count).toBe(3);
    expect(result.lint_warning_count).toBe(7);
  });

  it('computes duration for a long session', () => {
    vi.setSystemTime(new Date('2026-03-06T12:10:00Z'));
    const pasteTime = new Date('2026-03-06T12:00:00Z').getTime(); // 10 minutes ago

    const result = buildWorkflowProperties({
      inputMethod: 'confluence_paste',
      bbcodeLength: 5000,
      imageCount: 10,
      lintErrorCount: 0,
      lintWarningCount: 1,
      pasteTimestamp: pasteTime,
      context: 'announcements',
      editedAfterPaste: true,
    });

    expect(result.seconds_since_paste).toBe(600);
  });
});
