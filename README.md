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
│   │   └── index.ts        # MCP server implementation
│   ├── package.json        # MCP server dependencies
│   └── tsconfig.json       # MCP server TypeScript config
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- [Skaffold](https://skaffold.dev/) (optional, for local Kubernetes development)
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

### Running with Skaffold

For a production-like loop on a local Kubernetes cluster (such as [minikube](https://minikube.sigs.k8s.io/docs/) or [kind](https://kind.sigs.k8s.io/)), the repository ships with a hardened Skaffold configuration. Skaffold will build the Docker image with reproducible Git-based tags, apply the manifests, and port-forward traffic back to your machine.

```bash
skaffold dev
```

Once the deployment is ready, Skaffold forwards `localhost:3000` to the in-cluster service so you can interact with the app as usual.

> **Tip:** For a one-off deployment that mirrors a production rollout, run `skaffold run`. Skaffold will build with the same settings but exit once the deployment becomes healthy.

### Containerized Production Build

The included multi-stage Dockerfile produces a slim, non-root image that serves the Next.js [standalone output](https://nextjs.org/docs/app/building-your-application/deploying#standalone-mode). To build and run it locally:

```bash
docker build -t mudd-monkies-web .
docker run --rm -p 3000:3000 mudd-monkies-web
```

The container exposes port `3000`, responds to `/api/health`, and declares a `HEALTHCHECK` so orchestrators can determine readiness.

### Kubernetes Deployment

The manifests under `k8s/` describe a production-ready deployment with two replicas, resource requests/limits, and strict pod security defaults. Apply them to any cluster (after pushing the image to a registry your cluster can reach):

```bash
kubectl apply -f k8s/
```

The `Service` publishes the application on port `80`, while the `Deployment` defines HTTP probes hitting `/api/health` to guarantee the pods are healthy before accepting traffic.

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
4. **Extract Text**:
    - Click the "Extract Text" button to extract all text from the PDF.
5. **Navigate Pages**:
   - Use "Previous" and "Next" buttons to move between PDF pages
   - Measurements are saved per page
6. **View Results**:
   - Measurements are displayed in real-time on the drawing
   - A list of all measurements for the current page is shown below

## MCP Server Integration

### Overview

This project includes a complete **Model Context Protocol (MCP)** server that enables Claude to interact with the PDF Takeoff Tool. The MCP server provides tools for construction measurement analysis and PDF processing.

### MCP Server Features

- ✅ **Echo Tool**: Basic connectivity testing
- ✅ **PDF Analysis Tools**: Extract text from PDF files.
- ✅ **Construction Calculations**: Calculate the area of a polygon.
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

3. **Configure Claude Desktop**:
   
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

4. **Restart Claude Desktop** to load the MCP server.

5. **Test the Integration**:
   
   In Claude, try:
   ```
   Can you echo "Hello from MCP!"?
   ```
   
   Claude should respond using the MCP echo tool.

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
- `pdf_extract_text`: Extracts all text from a given PDF file.
- `calculate_area`: Calculates the area of a polygon given a list of points.

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

- ✅ MCP server with `echo`, `pdf_extract_text`, and `calculate_area` tools.
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
