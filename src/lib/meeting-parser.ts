
export interface ParsedTodo {
    content: string
    assignee: string
    dueDate: string
}

export function isValidDate(dateStr: string): boolean {
    if (!dateStr) return false;
    // Strict YYYY-MM-DD format check
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// Helper function to parse action items from content string if structured
export function parseActionItemsFromContent(content: string, meetingDate: string): ParsedTodo[] {
    const items: ParsedTodo[] = [];
    if (!content) return items;

    // 1. Normalize fullwidth pipes/spaces
    let normalizedContent = content.replace(/｜/g, '|').replace(/[\t\f\v]/g, ' ');

    // 2. FORCE NEWLINES after dates in run-on lines
    // Look for: Date + spaces + text + pipe (indicating start of next item)
    // We insert a newline after the date to break it up.
    normalizedContent = normalizedContent.replace(/(\d{4}-\d{2}-\d{2})\s+(?=[^|\n]+\|)/g, '$1\n');

    // Also handle cases where date is immediately followed by a pipe of the next item without checking content?
    // Actually, usually it's Date | Next Content
    // Be careful not to break "Date" column if it's the last one.

    const lines = normalizedContent.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // We expect at least: Content | Assignee ...
        // Split by pipe
        const parts = trimmedLine.split('|').map(p => p.trim());

        // Strategy for 3 or 4 columns
        if (parts.length >= 2) {
            const contentTextRaw = parts[0];
            const assignee = parts[1];

            // Potential columns for 3rd and 4th position
            const col3 = parts[2];
            const col4 = parts[3];

            // Determine content, removing leading bullets
            let finalContent = contentTextRaw.replace(/^[\s*\-.,]+/, '').trim();
            // Remove trailing date from previous line if it leaked
            const datePrefixMatch = finalContent.match(/^\d{4}-\d{2}-\d{2}\s+(.*)/);
            if (datePrefixMatch) finalContent = datePrefixMatch[1];

            // Determine due date
            let finalDate = null;
            let note = null;

            // Check col4 (most likely date in 4-col format)
            if (col4 && isValidDate(col4)) {
                finalDate = col4;
                // Then col3 is likely a note (or another date)
                if (col3 && !isValidDate(col3)) note = col3;
            }
            // fallback: check col3 if col4 wasn't the date
            else if (col3 && isValidDate(col3)) {
                finalDate = col3;
            }
            else {
                // No valid date found in col3 or col4.
                // Check if col3 is a text note (e.g. "ASAP")
                if (col3) note = col3;
            }

            // If we have a note but no date, default to meetingDate
            if (!finalDate && note) {
                finalDate = meetingDate;
            }

            // Append note to content
            if (note && note !== 'null' && note !== 'undefined') {
                finalContent = `${finalContent} (期限: ${note})`;
            }

            // Final sanity check
            if (finalContent && assignee) {
                items.push({
                    content: finalContent,
                    assignee: assignee,
                    dueDate: finalDate || meetingDate
                });
            }
        }
    }

    return items;
}
