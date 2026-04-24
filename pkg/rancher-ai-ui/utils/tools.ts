import { UIToolsConfig, UITool } from '../types';

/**
 * Compare two tool for differences ignoring enabled fields which are handled separately
 */
export function compareSpecTools(tool1: Record<string, any>, tool2: Record<string, any>): boolean {
  const t1 = { ...tool1 };
  const t2 = { ...tool2 };

  delete t1.enabled;
  delete t2.enabled;

  try {
    // Deep compare
    return JSON.stringify(t1, null, 0) !== JSON.stringify(t2, null, 0);
  } catch {
    return t1 !== t2;
  }
}

/**
 * Compare two spec configs for differences, ignoring enabled and systemPrompt fields which are handled separately
 */
export function compareSpecConfig(config1: Record<string, any>, config2: Record<string, any>): boolean {
  const c1 = { ...config1 };
  const c2 = { ...config2 };

  delete c1.enabled;
  delete c2.enabled;
  delete c1.systemPrompt;
  delete c2.systemPrompt;

  try {
    // Deep compare
    return JSON.stringify(c1, null, 0) !== JSON.stringify(c2, null, 0);
  } catch {
    return c1 !== c2;
  }
}

/**
 * Check if changes are detected between provided and current tools/config
 */
export function hasChanges(
  providedTools: UITool[],
  currentTools: UITool[],
  providedSpecConfig: UIToolsConfig,
  currentSpecConfig: UIToolsConfig,
): boolean {
  if (providedTools.length !== currentTools.length) {
    return true;
  }

  if (providedTools.map((t) => t.name).sort().join(',') !== currentTools.map((t) => t.name).sort().join(',')) {
    return true;
  }

  const providedByName = Object.fromEntries(providedTools.map((t) => [t.name, t]));
  const currentByName = Object.fromEntries(currentTools.map((t) => [t.name, t]));

  for (const name of Object.keys(providedByName)) {
    const providedTool = providedByName[name];
    const currentTool = currentByName[name];
    const providedToolRevision = providedTool.revision || 0;
    const currentToolRevision = currentTool.revision || 0;

    if (compareSpecTools(providedTool, currentTool)) {
      return true;
    }

    if (providedToolRevision > currentToolRevision) {
      if ((providedTool.enabled ?? true) !== (currentTool.enabled ?? true)) {
        return true;
      }
    }
  }

  if (compareSpecConfig(providedSpecConfig, currentSpecConfig)) {
    return true;
  }

  if (providedSpecConfig.revision > currentSpecConfig.revision) {
    if (providedSpecConfig.systemPrompt !== currentSpecConfig.systemPrompt) {
      return true;
    }
    if (providedSpecConfig.enabled !== currentSpecConfig.enabled) {
      return true;
    }
  }

  return false;
}
