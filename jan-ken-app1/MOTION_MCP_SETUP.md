# Motion Studio MCP Setup Guide

Motion Studio MCP provides the latest Motion documentation to your LLM via Resources.

## Installation Steps

### 1. Open Cursor Settings

1. Go to **Settings** → **Cursor Settings** → **Tools & MCPs**
2. Or use shortcut: `Ctrl+,` (Windows) / `Cmd+,` (Mac)

### 2. Add Motion Studio MCP

1. In the **Tools & MCPs** section, click **Add MCP Server** or **+**
2. Search for **"Motion Studio"** or **"motion-studio-mcp"**
3. If not found, you may need to install it manually:

### 3. Manual Installation (if needed)

If Motion Studio MCP is not available in the dropdown, you can add it manually:

```json
{
  "mcpServers": {
    "motion-studio": {
      "command": "npx",
      "args": ["-y", "@motionstudio/mcp"]
    }
  }
}
```

Add this to your Cursor MCP configuration file (usually in Cursor settings or `.cursor/mcp.json`).

### 4. Verify Installation

1. After adding, you should see **Motion Studio** in your MCP servers list
2. Click on the dropdown to see available Resources
3. You should see Motion documentation topics available

## Usage

### In Cursor Chat

1. Click on the **Resources** dropdown in chat
2. Select **Motion Studio** resources
3. Choose the documentation topic you need:
   - React animation
   - Layout animation
   - SVG animation
   - Motion component
   - etc.

### Direct Reference

You can also reference Motion docs directly in your prompts:
- Ask questions about Motion animations
- Request Motion code examples
- Get help with Motion APIs

## Benefits

✅ **Latest Documentation**: Always up-to-date Motion docs  
✅ **LLM Integration**: Direct access in chat  
✅ **Code Examples**: Real-world examples  
✅ **API Reference**: Complete API documentation  

## Resources Available

- Motion React documentation
- Motion JavaScript documentation
- Motion Vue documentation
- Animation examples
- API references
- Best practices

## Troubleshooting

If Motion Studio MCP doesn't appear:

1. **Check Cursor Version**: Make sure you're using the latest Cursor version
2. **Restart Cursor**: Close and reopen Cursor after adding MCP
3. **Check MCP Status**: Go to Settings → Tools & MCPs and verify it's enabled
4. **Manual Install**: Try installing `@motionstudio/mcp` globally:
   ```bash
   npm install -g @motionstudio/mcp
   ```

## More Information

- [Motion Studio MCP Documentation](https://motion.dev/docs/studio-llm-documentation)
- [Motion.dev Official Site](https://motion.dev)
- [Motion GitHub](https://github.com/motiondivision/motion)

---

**Note**: Motion+ users have access to additional MCP server with Motion+ APIs.


