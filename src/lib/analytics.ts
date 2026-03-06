import posthog from 'posthog-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trackEvent(event: string, properties?: Record<string, any>): void {
  posthog.capture(event, properties);
}

export function trackPageView(): void {
  posthog.capture('$pageview');
}

export type InputMethod = 'confluence_paste' | 'plaintext_paste' | 'markdown_paste' | 'file_open' | 'typed' | 'unknown';

export interface WorkflowProperties {
  input_method: InputMethod;
  content_length: number;
  image_count: number;
  lint_error_count: number;
  lint_warning_count: number;
  seconds_since_paste: number | null;
  context: string;
  edited_after_paste: boolean;
}

export function buildWorkflowProperties(opts: {
  inputMethod: InputMethod;
  bbcodeLength: number;
  imageCount: number;
  lintErrorCount: number;
  lintWarningCount: number;
  pasteTimestamp: number | null;
  context: string;
  editedAfterPaste: boolean;
}): WorkflowProperties {
  return {
    input_method: opts.inputMethod,
    content_length: opts.bbcodeLength,
    image_count: opts.imageCount,
    lint_error_count: opts.lintErrorCount,
    lint_warning_count: opts.lintWarningCount,
    seconds_since_paste: opts.pasteTimestamp
      ? Math.round((Date.now() - opts.pasteTimestamp) / 1000)
      : null,
    context: opts.context,
    edited_after_paste: opts.editedAfterPaste,
  };
}
