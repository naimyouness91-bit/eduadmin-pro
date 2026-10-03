/**
 * Lightweight Markdown rendering for AI tutor messages (no extra dependency).
 */
export default function MarkdownMessage({ content }) {
  if (!content) return null;

  const blocks = content.split(/\n\n+/);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-surface-800 dark:text-surface-200">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="font-semibold text-base mt-3 mb-1">
              {trimmed.replace(/^###\s+/, '')}
            </h4>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="font-display font-bold text-lg mt-4 mb-2">
              {trimmed.replace(/^##\s+/, '')}
            </h3>
          );
        }

        if (trimmed.startsWith('|')) {
          const rows = trimmed.split('\n').filter((r) => r.trim() && !r.includes('---'));
          return (
            <div key={i} className="overflow-x-auto my-2">
              <table className="text-xs w-full border-collapse">
                <tbody>
                  {rows.map((row, ri) => {
                    const cells = row.split('|').filter((c) => c.trim());
                    return (
                      <tr key={ri} className="border-b border-surface-200 dark:border-surface-700">
                        {cells.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1">
                            {cell.trim()}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        if (/^[-*]\s/.test(trimmed) || trimmed.includes('\n- ')) {
          const items = trimmed.split('\n').filter((l) => /^[-*]\s/.test(l.trim()));
          return (
            <ul key={i} className="list-disc ps-5 my-2 space-y-1 text-sm">
              {items.map((item, li) => (
                <li key={li}>{item.replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          );
        }

        const inline = trimmed
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>');

        return (
          <p
            key={i}
            className="text-sm leading-relaxed my-1.5"
            dangerouslySetInnerHTML={{ __html: inline }}
          />
        );
      })}
    </div>
  );
}
