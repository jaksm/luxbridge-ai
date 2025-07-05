# Tool Guide

- `./types.ts` contains types that you will reuse when creating tools (type RegisterTool is what you will use most of the time)
- create tool description markdown in `./templates/{tool-name}-tool-description.md` by following the guide below

## Registering the tool

This is an example of tool description:

```md
<description>
Retrieves the current authentication state and user information from the active session. Use this to verify user identity and check authentication status before performing protected operations.

<use-cases>
- Check authentication status: Verify if user is currently logged in
- Get user profile data: Retrieve username, email, and account details
- Validate session state: Confirm active session before API calls
- Debug auth issues: Troubleshoot authentication problems
- Display user info: Show current user details in UI components
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns null or empty data if user is not authenticated
- Session data reflects current OAuth token state
- Use before calling protected endpoints to avoid auth errors

Essential for verifying user authentication status and retrieving current session information for secure operations.
</description>
```

This is how you create the tool in `./{tool-name}-tool.ts`

```ts
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "./templates/get-auth-state-tool-description.md",
  {},
);

export const registerGetAuthStateTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool("get_auth_state", DESCRIPTION, {}, async () => {
      const result = {
        content: [
          {
            type: "text" as const,
            text: `✅ Authentication successful!\n\nAccess Token Info:\n${JSON.stringify(
              {
                userId: accessToken.userId,
                clientId: accessToken.clientId,
                expiresAt: accessToken.expiresAt,
              },
              null,
              2,
            )}`,
          },
        ],
      };

      return result;
    });
  };
```

Lastly we need to register the tool in `app/[transport]/route.ts` like this:

```ts
import { registerGetAuthStateTool } from "@/lib/tools/get-auth-state-tool";

// ...rest of code
return createMcpHandler((server) => {
  registerGetAuthStateTool({ accessToken })(server);
  // ...rest of tools
});
```

---

# Tool Description Writing Guide - how to write optimal tool descriptions, use this to rewrite all tool descriptions

Based on analysis of tool description templates across multiple MCP servers, this guide provides best practices for writing effective tool descriptions that are clear, actionable, and user-friendly.

## Best Practices

### Length and Structure

- **Optimal length**: 15-27 lines total
- **Core structure**: Opening description → use cases → warnings/notes → closing summary
- **Line economy**: Each line should provide specific value - avoid filler content
- **Scannable format**: Use clear sections that can be quickly parsed

### Opening Description

- **First sentence**: Concise statement of what the tool does
- **Second sentence**: When/why to use it or important context
- **Length**: 1-2 sentences maximum
- **Tone**: Direct and actionable

**Examples:**

```
✅ Good: "Updates an existing Jira issue with new field values. This tool modifies issue data immediately when called."
✅ Good: "Create technical work items for setup, maintenance, infrastructure, or non-user-facing activities typically completable within a sprint."
❌ Bad: "This tool is designed to help users manage and update their Jira issues in various ways depending on their needs."
```

### Closing Summary

- **Purpose**: Reinforce the tool's value proposition
- **Length**: 1-2 sentences
- **Focus**: What the tool enables users to achieve

**Examples:**

```
✅ Good: "Generate tasks with clear technical objectives, comprehensive definition of done criteria, and project context that enables development teams to deliver technical value supporting business goals."
✅ Good: "Generate organized Confluence pages that clearly describe intended functionality, user experience, and business requirements for development teams following the established documentation standards."
```

## Content Guidelines

### Use Cases Section

- **Format**: Bullet points with specific, concrete examples
- **Include parameters**: Show actual parameter values where helpful
- **Real-world scenarios**: Use realistic examples that users can relate to
- **Variety**: Cover different usage patterns and complexity levels

**Examples:**

```
✅ Good:
- Update issue title: issueId = "PROJ-123", title = "Updated: Fix login bug"
- Change assignee: issueId = "PROJ-456", assignee = "accountId123" OR assignee = "unassigned"
- Multiple fields: issueId = "PROJ-505", title = "New title", priority = "Medium", assignee = "unassigned"

✅ Good:
- Delete single issue: issueIds = ["PROJ-123"]
- Delete multiple issues: issueIds = ["PROJ-123", "PROJ-456", "PROJ-789"]
- Bulk cleanup: issueIds = ["TEST-1", "TEST-2", "TEST-3", "TEST-4", "TEST-5"]

❌ Bad:
- Update issues
- Change various fields
- Handle multiple scenarios
```

### Warning Systems

Use a clear hierarchy of warnings with appropriate visual indicators:

**Critical Warnings** (🚨):

- Permanent, irreversible operations
- Data loss potential
- System-wide impact

**Important Warnings** (⚠️):

- Significant side effects
- Workflow considerations
- Permission requirements

**Examples:**

```
✅ Good:
🚨 CRITICAL WARNINGS:
- PERMANENTLY deletes issues and their complete history
- Cannot be undone once executed
- Maximum 20 issues per request for safety

⚠️ IMPORTANT NOTES:
- Changes are permanent and modify issue history
- Only provided fields are updated - omitted fields remain unchanged
- Use management prompts to guide users through approval workflows before calling this tool
```

### Parameter Examples

- **Show realistic values**: Use actual IDs, titles, and data formats
- **Include edge cases**: Show both simple and complex usage
- **Demonstrate relationships**: Show how parameters work together

**Examples:**

```
✅ Good:
- Research existing features: text ~ "feature requirements" OR title ~ "functional spec"
- Find solution patterns: text ~ "user flow" OR title ~ "business rules"
- Access recent decisions: text ~ "decision" AND lastmodified >= now("-2w")

❌ Bad:
- Search for things
- Find documents
- Look up information
```

## Format Comparison

### XML-Style Format (Structured)

**Structure:**

```xml
<description>
Brief tool description and context.

<use-cases>
- Specific use case with parameters
- Another use case with examples
- Complex scenario with multiple parameters
</use-cases>

⚠️ IMPORTANT NOTES:
- Key consideration
- Important limitation
- Workflow guidance

Final summary statement about tool's purpose and value.
</description>
```

**Pros:**

- Clear, predictable structure
- Easy to parse programmatically
- Consistent formatting across tools
- Minimal cognitive load

**Cons:**

- Limited formatting options
- Less visually appealing
- Harder to create rich content hierarchy

### Pure Markdown Format (Rich)

**Structure:**

```markdown
# Tool Title

Brief description with context about integration and workflow.

## Core Functionality

Technical details about what the tool does.

## Use Cases

### Category 1

- Detailed use case descriptions
- Multiple scenarios per category

### Category 2

- Different type of use case
- More complex scenarios

## Important Considerations

- Key warnings and limitations
- Integration requirements
- Performance considerations

Final value proposition and integration context.
```

**Pros:**

- Rich formatting capabilities
- Better visual hierarchy
- More comprehensive documentation
- Flexible content organization

**Cons:**

- More complex to write consistently
- Potentially overwhelming for simple tools
- Requires more maintenance

## Recommendations

### For Simple Tools

- Use XML-style format for straightforward CRUD operations
- Focus on clear, concrete use cases
- Keep descriptions under 20 lines

### For Complex Tools

- Consider pure Markdown format for tools with multiple modes
- Include comprehensive examples and integration guidance
- Organize content with clear hierarchical sections

### Universal Principles

1. **Clarity over cleverness**: Direct language beats creative descriptions
2. **Examples over explanations**: Show don't tell with concrete parameters
3. **Safety first**: Always highlight destructive operations prominently
4. **User-focused**: Write from the user's perspective, not the system's
5. **Actionable content**: Every line should help users accomplish their goals
