# PDF Takeoff Tool

A web-based construction takeoff tool built with Next.js, TypeScript, and shadcn/ui that allows users to measure distances and areas directly on PDF blueprints.

## Features

- 📄 PDF file upload and rendering
- 📏 Linear measurements with real-world units
- 📐 Area measurements for spaces
- 🔍 Scale calibration for accurate measurements
- 📱 Responsive design
- 🎨 Modern UI with shadcn/ui components
- 📄 Multi-page PDF support
- 💾 Page-specific measurements
- 🤖 **Claude MCP Integration** - AI-powered measurement assistance

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icons
- **[MCP (Model Context Protocol)](https://modelcontextprotocol.io/)** - Claude integration

## Project Structure

```
├── src/                      # Next.js app source
│   ├── app/                  # Next.js app directory
│   ├── components/          
│   │   ├── ui/              # shadcn/ui components
│   │   └── PdfViewer.tsx    # Main PDF viewer component
│   ├── hooks/
│   │   └── usePdfHandler.ts # PDF handling logic
│   └── types/
│       └── pdf.ts           # TypeScript definitions
├── mcp-server/              # MCP server for Claude integration
│   ├── src/
│   │   ├── index.ts        # MCP server implementation
│   │   └── tools/
│   │       └── constructGuidance.ts
│   ├── package.json        # MCP server dependencies
│   └── tsconfig.json       # MCP server TypeScript config
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Claude Desktop (for MCP integration)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Satcomwarrior/Mudd-monkies.git
cd Mudd-monkies
```

2. Install Next.js app dependencies:
```bash
npm install
```

3. Install MCP server dependencies:
```bash
cd mcp-server
npm install
cd ..
```

4. Build the MCP server:
```bash
cd mcp-server
npm run build
cd ..
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### PDF Takeoff Web App

1. **Upload PDF**: Click the file input to upload your PDF blueprint.
2. **Set Scale**:
   - Enter a known measurement length
   - Select the unit (feet, meters, or inches)
   - Click "Set Scale"
   - Click two points on the drawing that represent that known length
3. **Take Measurements**:
   - Use the "Measure" tool for linear measurements
   - Use the "Area" tool for area measurements
   - Click points on the drawing to create measurements
   - For areas, click near the starting point to complete the shape
4. **Navigate Pages**:
   - Use "Previous" and "Next" buttons to move between PDF pages
   - Measurements are saved per page
5. **View Results**:
   - Measurements are displayed in real-time on the drawing
   - A list of all measurements for the current page is shown below

## MCP Server Integration

### Overview

This project includes a complete **Model Context Protocol (MCP)** server that enables Claude to interact with the PDF Takeoff Tool. The MCP server provides tools for construction measurement analysis and PDF processing.

### MCP Server Features

- ✅ **Echo Tool**: Basic connectivity testing
- 🧠 **Construct Guidance Tool**: Calls an external LLM with Claude-provided artifacts
- 🚧 **PDF Analysis Tools**: Extract measurements and validate blueprints (coming soon)
- 🚧 **Construction Calculations**: Area calculations and material estimations (coming soon)
- 🚧 **Blueprint Validation**: Automated quality checks (coming soon)

### Setting Up Claude MCP Integration

1. **Build the MCP Server**:
```bash
cd mcp-server
npm run build
```

2. **Test the MCP Server**:
```bash
npm start
# Should output: "Mudd Monkies MCP Server running on stdio"
# Press Ctrl+C to stop
```

3. **Configure MCP Server Environment**:

   Create `mcp-server/.env` (already checked into the repo) or update the existing one with values that point to your runtime and artifact storage:

   ```ini
   # Where Claude will drop prompt artifacts that the MCP server can read
   CLAUDE_AI_ARTIFACTS_PATH=C:\\Users\\Muddm\\Downloads\\CLAUDE_AI_ARTIFACTS

   # LLM runtime endpoint + auth
   LLM_API_URL=http://localhost:11434/v1/generate
   LLM_API_KEY=

   # Optional defaults for the construct_guidance tool
   LLM_MODEL=claude-3-opus
   LLM_TEMPERATURE=0.2
   LLM_MAX_TOKENS=1024
   LLM_REQUEST_TIMEOUT_MS=60000
   ```

   > **Tip (Windows):** Use escaped backslashes (`\\`) inside the `.env` file so Node.js resolves the path correctly. Ensure the specified folder exists and is accessible to the MCP process.

4. **Place prompt artifacts**:

   1. Create the directory defined by `CLAUDE_AI_ARTIFACTS_PATH` (for example `C:\Users\Muddm\Downloads\CLAUDE_AI_ARTIFACTS`).
   2. Drop prompt templates (e.g., `guidance_prompt.txt`) and any supporting context files (PDF summaries, project specs, etc.) into that folder before invoking the tool.

5. **Configure Claude Desktop**:
   
   Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
   
   ```json
   {
     "mcpServers": {
       "mudd-monkies": {
         "command": "node",
         "args": ["/absolute/path/to/Mudd-monkies/mcp-server/build/index.js"]
       }
     }
   }
   ```
   
   Replace `/absolute/path/to/Mudd-monkies` with the actual path to your project.

6. **Restart Claude Desktop** to load the MCP server.

7. **Test the Integration**:
   
   In Claude, try:
   ```
   Can you echo "Hello from MCP!"?
   ```
   
   Claude should respond using the MCP echo tool.

### Using the `construct_guidance` Tool

Once Claude is connected, provide the prompt artifact names and any optional overrides when you invoke the tool. Example request inside a Claude conversation:

```
Call the `construct_guidance` MCP tool with:
{
  "promptFile": "guidance_prompt.txt",
  "contextFiles": ["project_scope.md", "site_notes.md"],
  "variables": {
    "project_name": "Northside Library",
    "due_date": "2024-09-30"
  },
  "temperature": 0.1
}
```

The helper will read each artifact from `CLAUDE_AI_ARTIFACTS_PATH`, interpolate variables like `{{ project_name }}` inside the template, forward the constructed payload to your LLM runtime, and return the generated guidance back to Claude. Errors clearly indicate whether an artifact is missing or if the runtime call failed, making troubleshooting straightforward.

### MCP Development

**Directory Structure**:
```
mcp-server/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

**Development Commands**:
```bash
cd mcp-server

# Install dependencies
npm install

# Development (watch mode)
npm run dev

# Build for production
npm run build

# Start the server
npm start
```

**Available Tools**:
- `echo`: Test tool that echoes back messages
- `construct_guidance`: Generates constructability guidance using prompt artifacts and an external LLM runtime
- More tools coming soon for PDF analysis and construction calculations

### Extending the MCP Server

To add new tools:

1. Edit `mcp-server/src/index.ts`
2. Add tool definitions to the `TOOLS` array
3. Add handlers in the `CallToolRequestSchema` handler
4. Rebuild: `npm run build`
5. Restart Claude Desktop

## Development

- Built with Next.js App Router
- Uses TypeScript for type safety
- Implements a custom hook for PDF handling
- Utilizes two-canvas system for PDF and annotations
- Follows modern React patterns and best practices
- **MCP server follows official MCP TypeScript SDK patterns**

## Deployment

### Next.js App

Deploy to Vercel, Netlify, or any Node.js hosting platform:

```bash
npm run build
npm start
```

### MCP Server

The MCP server runs locally and connects to Claude Desktop. No separate deployment needed.

## Ready for Claude Use

🎉 **This repository is fully configured for Claude integration!**

- ✅ MCP server scaffold implemented
- ✅ Echo tool for testing connectivity
- ✅ TypeScript configuration
- ✅ Build system ready
- ✅ Documentation complete
- ✅ Claude Desktop integration instructions provided

**Next Steps for Development**:
1. Run `cd mcp-server && npm run build`
2. Configure Claude Desktop with the server path
3. Test the echo tool: "Can you echo 'Hello!'?"
4. Extend with construction-specific tools
5. Integrate with the Next.js PDF viewer

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both the web app and MCP server
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Developer Handoff Notes**:
- The MCP server uses the official MCP TypeScript SDK
- All configuration follows MCP best practices
- The echo tool demonstrates proper MCP tool implementation
- Ready for immediate Claude integration and testing
- Extensible architecture for additional construction tools
