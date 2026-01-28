const fs = require("fs").promises;
const { marked } = require("marked");
const logger = require("./logger");

/**
 * HTML Report Generator
 * Converts Markdown content to styled HTML with Mermaid diagram support
 */
module.exports = class HtmlReportGenerator {
  constructor(options = {}) {
    this.branchName = options.branchName || "unknown";
    this.mode = options.mode || "review";
    this.version = options.version || "1.0.0";
  }

  /**
   * Convert mermaid code blocks to div elements for browser rendering
   * @param {string} markdown - Raw markdown content
   * @returns {string} - Preprocessed markdown
   */
  preprocessMermaid(markdown) {
    return markdown.replace(
      /```mermaid\n([\s\S]*?)```/g,
      '<div class="mermaid">\n$1</div>'
    );
  }

  /**
   * Generate complete HTML document from markdown
   * @param {string} markdownContent - Markdown content from LLM
   * @returns {string} - Complete HTML document
   */
  generateHtml(markdownContent) {
    const preprocessed = this.preprocessMermaid(markdownContent);
    const htmlContent = marked.parse(preprocessed);

    return this.getTemplate()
      .replace(/\{\{branchName\}\}/g, this.escapeHtml(this.branchName))
      .replace(/\{\{mode\}\}/g, this.escapeHtml(this.mode))
      .replace(/\{\{timestamp\}\}/g, new Date().toLocaleString())
      .replace(/\{\{version\}\}/g, this.escapeHtml(this.version))
      .replace(/\{\{content\}\}/g, htmlContent);
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Get HTML template with embedded styles
   */
  getTemplate() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Review - {{branchName}}</title>
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f6f8fa;
      --bg-tertiary: #eef1f4;
      --text-primary: #24292f;
      --text-secondary: #57606a;
      --border-color: #d0d7de;
      --accent-color: #0969da;
      --accent-hover: #0550ae;
      --code-bg: #f6f8fa;
      --success-color: #1a7f37;
      --warning-color: #9a6700;
      --error-color: #cf222e;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #0d1117;
        --bg-secondary: #161b22;
        --bg-tertiary: #21262d;
        --text-primary: #e6edf3;
        --text-secondary: #8b949e;
        --border-color: #30363d;
        --accent-color: #58a6ff;
        --accent-hover: #79c0ff;
        --code-bg: #161b22;
        --success-color: #3fb950;
        --warning-color: #d29922;
        --error-color: #f85149;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: var(--text-primary);
      background: var(--bg-primary);
      max-width: 980px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }

    header h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .meta span {
      background: var(--bg-secondary);
      padding: 0.25rem 0.75rem;
      border-radius: 2rem;
      border: 1px solid var(--border-color);
    }

    main {
      min-height: 60vh;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.25;
    }

    h1 { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }

    p {
      margin: 1em 0;
    }

    a {
      color: var(--accent-color);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }

    li {
      margin: 0.25em 0;
    }

    li > ul, li > ol {
      margin: 0;
    }

    blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 4px solid var(--accent-color);
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }

    blockquote > :first-child {
      margin-top: 0;
    }

    blockquote > :last-child {
      margin-bottom: 0;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
      font-size: 0.875em;
      background: var(--bg-secondary);
      padding: 0.2em 0.4em;
      border-radius: 6px;
    }

    pre {
      margin: 1em 0;
      padding: 1rem;
      background: var(--code-bg);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow-x: auto;
    }

    pre code {
      background: none;
      padding: 0;
      font-size: 0.875rem;
      line-height: 1.45;
    }

    table {
      width: 100%;
      margin: 1em 0;
      border-collapse: collapse;
      border-spacing: 0;
    }

    th, td {
      padding: 0.75rem 1rem;
      border: 1px solid var(--border-color);
      text-align: left;
    }

    th {
      background: var(--bg-secondary);
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: var(--bg-secondary);
    }

    hr {
      border: 0;
      height: 1px;
      background: var(--border-color);
      margin: 2em 0;
    }

    img {
      max-width: 100%;
      height: auto;
    }

    .mermaid {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 1.5rem;
      margin: 1.5em 0;
      text-align: center;
      overflow-x: auto;
    }

    footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      header h1 {
        font-size: 1.5rem;
      }

      .meta {
        flex-direction: column;
        gap: 0.5rem;
      }

      pre {
        padding: 0.75rem;
      }
    }

    @media print {
      body {
        max-width: none;
        padding: 0;
      }

      .mermaid {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>PR Review Report</h1>
    <div class="meta">
      <span>Branch: {{branchName}}</span>
      <span>Mode: {{mode}}</span>
      <span>Generated: {{timestamp}}</span>
    </div>
  </header>

  <main>
    {{content}}
  </main>

  <footer>
    <p>Generated by pr-reviewer v{{version}}</p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
      securityLevel: 'loose'
    });
  </script>
</body>
</html>`;
  }

  /**
   * Save HTML report to file
   * @param {string} markdownContent - Markdown content to convert
   * @param {string} outputPath - Path to save HTML file
   * @returns {Promise<string>} - Output path
   */
  async saveReport(markdownContent, outputPath) {
    const html = this.generateHtml(markdownContent);
    await fs.writeFile(outputPath, html, "utf-8");
    logger.info(`HTML report saved to ${outputPath}`);
    return outputPath;
  }
};
