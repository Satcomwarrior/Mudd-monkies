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
- 🧠 ConstructConnect AI guidance surfaced directly in the PDF viewer
- 📊 Algorithmic insight cards summarising totals, variance, and scale status for the active page

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
   - Algorithmic insight cards summarise totals and variability before ConstructConnect AI recommendations

### ConstructConnect AI Guidance Setup

The AI guidance panel calls a ConstructConnect-compatible service that can leverage your proprietary LLM artifacts. Configure the following environment variables in a `.env.local` file at the project root before running `npm run dev`:

```bash
CONSTRUCTCONNECT_BASE_URL="https://your-ai-gateway.example.com"
CONSTRUCTCONNECT_API_KEY="your-api-key"
CONSTRUCTCONNECT_ARTIFACT_DIR="/absolute/path/to/CLAUDE_AI_ARTIFACTS"
```

- `CONSTRUCTCONNECT_BASE_URL` — Base URL of the REST endpoint that proxies requests to your ConstructConnect/LLM service.
- `CONSTRUCTCONNECT_API_KEY` — Credential used to authenticate the API calls.
- `CONSTRUCTCONNECT_ARTIFACT_DIR` — Directory containing the artifact bundle referenced by your model (e.g., `C:\Users\Muddm\Downloads\CLAUDE_AI_ARTIFACTS`).

When a PDF is opened or a measurement is captured, the frontend calls `/api/guidance`, which relays the context to your service and streams the responses into the guidance panel.

## MCP Server Integration

### Overview

This project includes a complete **Model Context Protocol (MCP)** server that enables Claude to interact with the PDF Takeoff Tool. The MCP server provides tools for construction measurement analysis and PDF processing.

### MCP Server Features

- ✅ **Echo Tool**: Basic connectivity testing
- ✅ **construct_guidance Tool**: Routes prompts and measurement context to your ConstructConnect-compatible LLM runner using the artifact bundle
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
- `construct_guidance`: Supplies project context to your proprietary LLM and returns ConstructConnect-style recommendations
- More tools coming soon for PDF analysis and construction calculations

### MCP Environment

Copy `.env.example` to `.env` (or create a new `.env`) inside `mcp-server/` and set:

```bash
CLAUDE_AI_ARTIFACTS_PATH="/absolute/path/to/CLAUDE_AI_ARTIFACTS"
CONSTRUCTCONNECT_MODEL_ENDPOINT="https://your-ai-gateway.example.com/guidance"
CONSTRUCTCONNECT_MODEL_API_KEY="your-api-key"
```

- `CLAUDE_AI_ARTIFACTS_PATH` should match the location of the artifact bundle Claude must reference.
- `CONSTRUCTCONNECT_MODEL_ENDPOINT` points at the executable or HTTP endpoint that executes your proprietary model.
- `CONSTRUCTCONNECT_MODEL_API_KEY` is forwarded as an authorization header when present.

### Extending the MCP Server

To add new tools:

1. Edit `mcp-server/src/index.ts`
2. Add tool definitions to the `TOOLS` array
3. Add handlers in the `CallToolRequestSchema` handler
4. Rebuild: `npm run build`
5. Restart Claude Desktop

## Testing

The project currently relies on linting as its automated test coverage. Run the suite before committing changes:

```bash
npm run lint
```

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

## Quantum-inspired optimisation explained

The `python/quantum_blueprint_optimizer.py` module is a classical solver that borrows the maths of continuous-time quantum walks. It is not a quantum computer, but it does simulate a complex-valued wavefunction so the optimiser can examine many layout permutations at once without getting trapped in a greedy corner case.

### What "quantum-inspired" actually means

- **Still classical hardware.** Everything runs on CPUs or GPUs, but the maths mirrors textbook quantum mechanics. The solver constructs a Hamiltonian matrix `H`, evolves a complex-valued state vector `psi`, and keeps the amplitudes normalised—exactly what you would do when integrating the Schrödinger equation.
- **A real simulation, not branding.** The update step is literally `U = torch.linalg.matrix_exp(-1j * H * dt)` followed by `psi = U @ psi`. That `U` operator is the continuous-time quantum walk evolution operator; PyTorch handles the heavy matrix exponential so the algorithm can explore thousands of layout possibilities in superposition before sampling a result.
- **Purpose built for optimisation.** The Hamiltonian encodes "badness": incompatible fixtures, low veil factors, or user penalties raise the energy. The walk drifts toward low-energy (high-quality) configurations across the entire blueprint simultaneously rather than stepping through placements one at a time.

### Why this is different from "everyday" algorithms

- **Greedy placement falls short.** A conventional greedy strategy drops fixtures in the nearest cheap spot and immediately commits to that choice. Once an early placement is wrong the whole layout collapses.
- **Brute force is intractable.** Enumerating every layout for even 60 fixtures exceeds the number of atoms in the known universe. No amount of simple looping gets you an answer in time.
- **Quantum walk keeps the global picture.** Because the probability wave spans the whole graph, harmony rules reinforce compatible pairings while dissonance damps conflicts. Sampling the wavefunction after evolution produces globally consistent sectors instead of local dead-ends.

### What engineers can inspect

- **Hamiltonian matrix.** Every compatibility, veil, and preference shows up explicitly so you can audit the energy landscape.
- **Wavefunction (`psi`).** Returned alongside the selected fixtures for downstream tooling or sanity checks.
- **Probabilities and selections.** The optimiser surfaces both the raw probabilities per node and the chosen IDs, making it easy to compare against domain expectations.

If the model does not deliver acceptable layouts, you can adjust the Hamiltonian weights, introduce extra penalties or preferences, or even swap the solver out entirely—the surrounding pipeline remains agnostic.
