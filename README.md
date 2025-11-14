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
- 🤖 **AI-Powered Tools** - AI-powered measurement assistance, text extraction, and blueprint validation.

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icons

## Project Structure

```
├── src/                      # Next.js app source
│   ├── app/                  # Next.js app directory
│   │   └── api/
│   │       └── mcp/
│   │           └── route.ts # API route for AI tools
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── PdfViewer.tsx    # Main PDF viewer component
│   ├── hooks/
│   │   └── usePdfHandler.ts # PDF handling logic
│   └── types/
│       └── pdf.ts           # TypeScript definitions
├── mcp-server/              # AI tool logic
│   ├── src/
│   │   ├── index.ts        # MCP server for Claude integration
│   │   └── tool-handler.ts # Core AI tool logic
│   ├── package.json        # Dependencies
│   └── tsconfig.json       # TypeScript config
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Satcomwarrior/Mudd-monkies.git
cd Mudd-monkies
```

2. Install dependencies for the main application and the AI tools:

```bash
npm install
npm install --prefix mcp-server
```

3. Build the AI tool handler:

```bash
cd mcp-server
npm run build
cd ..
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

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
4. **AI Tools**:
   - Click "Extract Text" to extract all text from the PDF.
   - Click "Validate Blueprint" to check for a title block and scale information.
5. **Navigate Pages**:
   - Use "Previous" and "Next" buttons to move between PDF pages.
6. **View Results**:
   - Measurements and AI tool results are displayed on the page.

## AI Tool Integration

### Overview

The project's AI capabilities are powered by a set of tools located in the `mcp-server` directory. These tools are written in TypeScript and are called by the Next.js application via an API route. This architecture allows for a clean separation of concerns between the frontend and the AI logic.

### Available Tools

- `echo`: A simple test tool that echoes back a message.
- `pdf_extract_text`: Extracts all text from a given PDF file.
- `calculate_area`: Calculates the area of a polygon given a list of points.
- `validate_blueprint`: Performs basic quality checks on a blueprint PDF.

### Extending the AI Tools

To add new tools:

1. Edit `mcp-server/src/tool-handler.ts` to add the new tool's logic.
2. Add the tool's definition to the `TOOLS` array in `mcp-server/src/index.ts`.
3. Rebuild the tool handler: `npm run build --prefix mcp-server`

## Development

- Built with Next.js App Router
- Uses TypeScript for type safety
- Follows modern React patterns and best practices
- AI tools are modular and directly importable

## Deployment

Deploy to Vercel, Netlify, or any Node.js hosting platform:

```bash
npm run build
npm start
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
