import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

function renderMarkdown(markdown) {
  const html = marked.parse(markdown || '');
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}

export { renderMarkdown };
