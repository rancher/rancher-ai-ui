# UI Tools Configuration Guide

This guide explains how to define tools for the Rancher AI UI in `ui-tools.json`. Tools allow the AI agent to select and dispatch specialized UI components based on the context of user requests.

## Table of Contents

1. [Overview](#overview)
2. [Basic Tool Structure](#basic-tool-structure)
3. [Tool Naming Conventions](#tool-naming-conventions)
4. [Writing Effective Prompts](#writing-effective-prompts)
5. [Schema Properties & Types](#schema-properties--types)
6. [Validation Rules](#validation-rules)
7. [Complete Example](#complete-example)
8. [Best Practices](#best-practices)

---

## Overview

Each tool is associated with:

- **Name**: Unique identifier (e.g., `display-config`, `open-editor`)
- **Description**: What the tool does
- **Prompt**: Instructions for the LLM on when and how to use the tool
- **Category**: Type of component (e.g., `editor`, `viewer`, `selector`, `navigation`)
- **Schema**: JSON schema defining required and optional parameters
- **Enabled**: Boolean flag to enable/disable the tool
- **Metadata**: Version, compatibility, and enum definitions

---

## Basic Tool Structure

```json
{
  "name": "tool-identifier",
  "description": "Brief description of what this tool does",
  "prompt": "Instructions for the LLM about when to use this tool",
  "category": "viewer|editor|selector|navigation",
  "revision": 1,
  "enabled": true,
  "defaultValues": {
    "enabled": true
  },
  "schema": {
    "properties": {
      "fieldName": {
        "type": "string|number|boolean|object",
        "description": "Field description",
        "required": true
      }
    }
  },
  "metadata": {
    "version": "1.0"
  }
}
```

**Revision gated updates**: Incrementing the `revision` **overwrites all user-configured values** for the tool (enabled state, custom configurations, etc.). Only increment this when you want to reset user settings to defaults. Use this carefully in production environments.

---

## Tool Naming Conventions

- Use **lowercase, hyphen-separated** names: `display-json`, `open-editor`, `show-diff`
- Names should **clearly indicate purpose**
- Avoid ambiguous names; **namespace them** (e.g., `resource-viewer`, `config-editor`)

---

## Writing Effective Prompts

The prompt is critical for LLM decision-making. A good prompt should:

### 1. Define Scope Clearly

Use the `TOOL SCOPE:` marker to indicate what scope the tool operates on:

```
TOOL SCOPE: single-resource    ← For one specific resource
TOOL SCOPE: list or collection ← For multiple resources or lists
TOOL SCOPE: navigation         ← For page navigation
```

### 2. Specify Use Cases (When to Use)

```
USE THIS TOOL ONLY WHEN:
- The context identifies a specific item by exact ID or name
- The user is asking for details about that ONE resource
- You are displaying information about a single resource
```

### 3. Prohibit Misuse (When NOT to Use)

```
NEVER USE THIS TOOL WHEN:
- Showing multiple items (list of configs, users, etc.)
- The context mentions 'list', 'all', 'multiple', or plurals
- You would need to call this tool 2+ times with different item identifiers
```

### 4. Include Call Instructions

```
When you call this tool: Display formatted content for item {itemId} 
of type {resourceType}. PRESERVE all formatting and structure.
```

### Example Prompt

```
TOOL SCOPE: single-resource

You are selecting whether to use this tool. THIS TOOL IS FOR ONE SPECIFIC ITEM ONLY.

USE THIS TOOL ONLY WHEN:
- The context identifies a specific item by exact ID or name (e.g., 'config-prod-db')
- The user is asking for details about that ONE item
- You are displaying information about a single resource

NEVER USE THIS TOOL WHEN:
- Showing multiple items (list of configs, users, etc.)
- The context mentions 'list', 'all', 'multiple', or plurals
- You would need to call this tool 2+ times with different item identifiers

When you call this tool: Display formatted content for item {resourceId} 
of type {resourceType}. The content is: {content}. PRESERVE all formatting.
```

---

## Schema Properties & Types

### Supported Types

```json
{
  "yaml": {
    "type": "string",           // Text content
    "description": "YAML content"
  },
  "copyable": {
    "type": "boolean",          // true/false
    "description": "Enable copy"
  },
  "timeout": {
    "type": "number",           // Integer or decimal
    "description": "Wait time (seconds)"
  },
  "metadata": {
    "type": "object",           // Nested JSON object
    "description": "Custom metadata"
  }
}
```

### Required vs. Optional Fields

```json
{
  "resourceId": {
    "type": "string",
    "description": "Resource identifier",
    "required": true       // ← Must be provided by LLM
  },
  "title": {
    "type": "string",
    "description": "Display title"
    // ← Optional (no "required" field)
  }
}
```

### Enum Properties (Constrained Values)

```json
{
  "viewType": {
    "type": "string",
    "enum": ["list", "detail", "timeline", "chart"],
    "description": "Display format",
    "required": true
  }
}
```

### String Constraints

```json
{
  "label": {
    "type": "string",
    "maxLength": 50,          // Maximum length
    "minLength": 1,           // Minimum length
    "description": "Display text"
  }
}
```

### Enum with Metadata (Advanced)

Use metadata to provide detailed descriptions and conditional requirements:

```json
{
  "schema": {
    "properties": {
      "viewType": {
        "type": "string",
        "enum": ["list", "detail", "timeline"],
        "description": "Display format",
        "required": true
      },
      "filter": {
        "type": "string",
        "description": "Filter criteria"
      },
      "itemId": {
        "type": "string",
        "description": "Item identifier"
      }
    }
  },
  "metadata": {
    "version": "1.0",
    "enum": {
      "viewType": {
        "list": {
          "description": "SCOPE: collection. Shows items in tabular list.",
          "requires": ["filter"]
        },
        "detail": {
          "description": "SCOPE: single. Shows detailed view of one item.",
          "requires": ["itemId"]
        },
        "timeline": {
          "description": "SCOPE: collection. Shows time-series events.",
          "requires": ["itemId"]
        }
      }
    }
  }
}
```

**Important**: Fields listed in the `requires` array must exist as properties in the schema.

---

## Validation Rules

### By Type

| Type    | Validation |
|---------|-----------|
| string  | Length constraints (maxLength, minLength), enum validation |
| boolean | Must be true/false |
| number  | Integer or decimal values |
| object  | JSON structure validation |
| array   | Item type validation (if specified) |

### Required Fields Validation

- Fields marked `"required": true` **must be provided** by the LLM
- Field **types must match** schema (`string`, `boolean`, etc.)
- Missing required fields → tool dispatch **rejected**
- Type mismatch → tool dispatch **rejected**

### Enum Validation

- LLM must select from **allowed values only**
- Any other value → validation fails

### Category-Based Validation

Different categories enforce different rules. The `selector` category requires that exactly one enum option is chosen.

---

## Complete Example

```json
{
  "name": "display-json",
  "description": "Display formatted JSON content of a resource",
  "prompt": "TOOL SCOPE: single-resource\n\nYou are selecting whether to use this tool. THIS TOOL IS FOR ONE SPECIFIC ITEM ONLY.\n\nUSE THIS TOOL ONLY WHEN:\n- The context identifies a specific item by exact ID or name\n- The user is asking for details about that ONE resource\n\nNEVER USE THIS TOOL WHEN:\n- Showing multiple items\n- The context mentions 'list', 'all', 'multiple', or plurals\n- You would need to call this tool 2+ times\n\nWhen you call this tool: Display formatted content for item {resourceId} of type {resourceType}. Content: {content}. PRESERVE all formatting.",
  "category": "viewer",
  "revision": 1,
  "enabled": true,
  "defaultValues": {
    "enabled": true
  },
  "schema": {
    "properties": {
      "content": {
        "type": "string",
        "description": "JSON content to display",
        "required": true
      },
      "resourceType": {
        "type": "string",
        "description": "Type of resource (Config, Database, etc.)",
        "required": true
      },
      "resourceId": {
        "type": "string",
        "description": "Exact resource identifier",
        "required": true,
        "maxLength": 500
      },
      "title": {
        "type": "string",
        "description": "Display title",
        "required": false
      },
      "searchable": {
        "type": "boolean",
        "description": "Enable search functionality"
      },
      "copyable": {
        "type": "boolean",
        "description": "Enable copy to clipboard"
      },
      "viewType": {
        "type": "string",
        "enum": ["compact", "expanded", "raw"],
        "description": "Display format for the content",
        "required": true
      }
    }
  },
  "metadata": {
    "version": "1.0",
    "enum": {
      "viewType": {
        "compact": {
          "description": "Show essential fields only",
          "requires": []
        },
        "expanded": {
          "description": "Show all fields with descriptions",
          "requires": ["searchable"]
        },
        "raw": {
          "description": "Show unformatted JSON",
          "requires": []
        }
      }
    }
  }
}
```

---

## Best Practices

1. **Prompts**: Be explicit about scope (single vs. multiple resources)
2. **Required Fields**: Only mark fields as required if always needed
3. **Descriptions**: Provide clear, actionable descriptions for all fields
4. **Constraints**: Use `maxLength` for UI display limits
5. **Enums**: List all valid options; use metadata to document each option
6. **Naming**: Use clear, namespaced names that indicate the tool's purpose
7. **Validation**: Ensure schema matches actual component implementation
8. **Documentation**: Include TOOL SCOPE and USE/NEVER USE keywords in prompts
9. **Versioning**: Only increment `revision` when you intentionally want to reset user settings. Each increment will overwrite all user-configured values (enabled state, tool parameters, etc.). This is useful for major breaking changes but should be used sparingly.
10. **Testing**: Validate that LLM correctly interprets your prompts and selects the right parameters

---

## Additional Resources

For more detailed information, see the [UI Tools Configuration Guide](https://github.com/rancher/rancher-ai-agent/blob/main/app/services/ui_tools/README.md) in the rancher-ai-agent repository.