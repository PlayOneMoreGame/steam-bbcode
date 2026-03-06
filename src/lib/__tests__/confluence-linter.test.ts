import { describe, it, expect } from 'vitest';
import { lintConfluence } from '../confluence-linter';

describe('lintConfluence', () => {
  describe('unsupported macros', () => {
    it('warns about info panel macro', () => {
      const xhtml = '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>Note</p></ac:rich-text-body></ac:structured-macro>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('"info"'))).toBe(true);
    });

    it('warns about warning panel macro', () => {
      const xhtml = '<ac:structured-macro ac:name="warning"><ac:rich-text-body><p>Warning</p></ac:rich-text-body></ac:structured-macro>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('"warning"'))).toBe(true);
    });

    it('warns about note panel macro', () => {
      const xhtml = '<ac:structured-macro ac:name="note"><ac:rich-text-body><p>Note</p></ac:rich-text-body></ac:structured-macro>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('"note"'))).toBe(true);
    });

    it('warns about toc macro', () => {
      const xhtml = '<ac:structured-macro ac:name="toc" />';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('"toc"'))).toBe(true);
    });

    it('does not warn about code macro (supported)', () => {
      const xhtml = '<ac:structured-macro ac:name="code"><ac:plain-text-body>x=1</ac:plain-text-body></ac:structured-macro>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('"code"'))).toBe(false);
    });

    it('only warns once per macro type', () => {
      const xhtml = '<ac:structured-macro ac:name="info"><ac:rich-text-body><p>A</p></ac:rich-text-body></ac:structured-macro><ac:structured-macro ac:name="info"><ac:rich-text-body><p>B</p></ac:rich-text-body></ac:structured-macro>';
      const result = lintConfluence(xhtml, 'announcements');
      const infoWarnings = result.warnings.filter(w => w.message.includes('"info"'));
      expect(infoWarnings.length).toBe(1);
    });
  });

  describe('image attachments', () => {
    it('warns about image attachments needing upload', () => {
      const xhtml = '<ac:image><ri:attachment ri:filename="screenshot.png" /></ac:image>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('image') && w.message.includes('Confluence'))).toBe(true);
    });

    it('counts multiple images', () => {
      const xhtml = '<ac:image><ri:attachment ri:filename="a.png" /></ac:image><ac:image><ri:attachment ri:filename="b.png" /></ac:image>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('2 image'))).toBe(true);
    });

    it('adds guides-specific note about previewimg', () => {
      const xhtml = '<ac:image><ri:attachment ri:filename="test.png" /></ac:image>';
      const result = lintConfluence(xhtml, 'guides');
      expect(result.warnings.some(w => w.message.includes('previewimg'))).toBe(true);
    });

    it('adds reviews-specific note about unsupported images', () => {
      const xhtml = '<ac:image><ri:attachment ri:filename="test.png" /></ac:image>';
      const result = lintConfluence(xhtml, 'reviews');
      expect(result.warnings.some(w => w.message.includes('not supported in') && w.message.includes('reviews'))).toBe(true);
    });

    it('no image warning when no attachments', () => {
      const xhtml = '<p>Just text</p>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('image') && w.message.includes('Confluence'))).toBe(false);
    });
  });

  describe('empty links', () => {
    it('warns about ac:link without target', () => {
      const xhtml = '<ac:link><ac:plain-text-link-body>broken link</ac:plain-text-link-body></ac:link>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('no destination'))).toBe(true);
    });

    it('does not warn about ac:link with ri:page', () => {
      const xhtml = '<ac:link><ri:page ri:content-title="SomePage" /><ac:plain-text-link-body>link</ac:plain-text-link-body></ac:link>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.warnings.some(w => w.message.includes('no destination'))).toBe(false);
    });
  });

  describe('malformed XHTML', () => {
    it('errors on severely mismatched ac: tags', () => {
      // 10 opening, 0 closing — clearly malformed
      const xhtml = Array(10).fill('<ac:image>').join('');
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.errors.some(e => e.message.includes('malformed'))).toBe(true);
    });

    it('no error on well-formed XHTML', () => {
      const xhtml = '<ac:image><ri:attachment ri:filename="test.png" /></ac:image>';
      const result = lintConfluence(xhtml, 'announcements');
      expect(result.errors.length).toBe(0);
    });
  });

  describe('clean input', () => {
    it('returns no errors or warnings for plain HTML', () => {
      const result = lintConfluence('<p>Simple paragraph</p>', 'announcements');
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });
  });
});
