// src/permissions/writer.mjs — V7.0 permission modification system
// Pure string manipulation, NO YAML parser (SEC-01)

const BOM = '\uFEFF';

/**
 * Find the start/end byte offsets of the frontmatter block.
 * @param {string} content - Full file content
 * @returns {{ start: number, end: number, body: string } | null}
 *   start = index after first '---\n'
 *   end   = index of second '---'
 *   body  = content between the markers
 *   null if no valid frontmatter found
 */
export function readFrontmatterBoundaries(content) {
  let offset = 0;
  if (content.startsWith(BOM)) offset = 1;

  // First --- must be at the very start (after optional BOM)
  if (!content.startsWith('---', offset)) return null;

  const afterDashes = offset + 3;
  // Must be followed by \n or \r\n (not just `---EOF` or `---stuff`)
  if (content[afterDashes] === '\r' && content[afterDashes + 1] === '\n') {
    // CRLF
  } else if (content[afterDashes] === '\n') {
    // LF
  } else {
    return null;
  }

  const start = content.indexOf('\n', afterDashes) + 1;

  // Find closing --- on its own line
  // It must be preceded by \n (or \r\n) and followed by \n, \r\n, or EOF
  let searchFrom = start;
  while (searchFrom < content.length) {
    const idx = content.indexOf('---', searchFrom);
    if (idx === -1) return null;

    // Check it's at the start of a line
    const prevChar = idx > 0 ? content[idx - 1] : null;
    const isLineStart = prevChar === '\n';
    if (!isLineStart) {
      searchFrom = idx + 3;
      continue;
    }

    // Check nothing meaningful follows on the same line (allow \n, \r\n, or EOF)
    const afterClose = idx + 3;
    if (afterClose >= content.length ||
        content[afterClose] === '\n' ||
        (content[afterClose] === '\r' && content[afterClose + 1] === '\n')) {
      const body = content.slice(start, idx);
      return { start, end: idx, body };
    }

    searchFrom = idx + 3;
  }

  return null;
}

/**
 * Determine whether a YAML key needs double-quoting.
 * Quotes when the key contains `*` or a space.
 * @param {string} key
 * @returns {string}
 */
function quoteKey(key) {
  if (key.includes('*') || key.includes(' ')) return `"${key}"`;
  return key;
}

/**
 * Build YAML text for a permission block.
 * @param {Record<string, string | Record<string, string>>} permissions
 * @returns {string} YAML lines including the `permission:` header
 */
export function buildPermissionYaml(permissions) {
  let out = 'permission:\n';

  for (const [name, value] of Object.entries(permissions)) {
    if (typeof value === 'string') {
      out += `  ${name}: ${value}\n`;
    } else if (typeof value === 'object' && value !== null) {
      out += `  ${name}:\n`;
      for (const [pattern, action] of Object.entries(value)) {
        out += `    ${quoteKey(pattern)}: ${action}\n`;
      }
    }
  }

  return out;
}

/**
 * Replace the permission block in frontmatter content.
 * @param {string} content - Full file content (with frontmatter)
 * @param {string} newPermissionYaml - Output from buildPermissionYaml()
 * @returns {string} Updated file content
 */
export function spliceFrontmatter(content, newPermissionYaml) {
  const bounds = readFrontmatterBoundaries(content);
  if (!bounds) return content;

  const { start, end, body } = bounds;

  // Regex: match `permission:` at start of line, the rest of that line,
  // then all following lines that are indented (start with whitespace)
  const permRe = /^permission:[ \t]*(?:\r?\n)(?:[ \t]+[^\n]*(?:\r?\n|$))*/m;
  const match = permRe.exec(body);

  let newBody;
  if (match) {
    // Replace existing permission block
    const before = body.slice(0, match.index);
    const after = body.slice(match.index + match[0].length);
    newBody = before + newPermissionYaml + after;
  } else {
    // No existing permission block — append before closing ---
    // Ensure there's a trailing newline before we append
    const separator = body.length > 0 && !body.endsWith('\n') ? '\n' : '';
    newBody = body + separator + newPermissionYaml;
  }

  return content.slice(0, start) + newBody + content.slice(end);
}

/**
 * Apply a permission preset to an agent file's content.
 * @param {string} content - Full file content
 * @param {Record<string, string | Record<string, string>>} permissions
 * @returns {string} Updated file content
 */
export function applyPermissions(content, permissions) {
  const yaml = buildPermissionYaml(permissions);
  return spliceFrontmatter(content, yaml);
}
