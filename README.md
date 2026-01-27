# TorrentEdge Dashboard

A modern, real-time web dashboard for managing and monitoring torrents built with React, TypeScript, and Vite.

## Features

- 🚀 **Real-time Monitoring** - Live updates of torrent status, download/upload speeds, and progress
- 📊 **System Statistics** - View comprehensive system stats including active torrents, total bandwidth, and storage usage
- 🎯 **Torrent Management** - Add torrents via magnet links or torrent files, pause/resume downloads
- 🔐 **Secure Authentication** - JWT-based authentication system
- 🎨 **Modern UI** - Sleek dark-themed interface with responsive design
- 📈 **Visual Analytics** - Charts and graphs powered by Recharts

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Custom components with Lucide React icons
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS (utility-first approach)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- TorrentEdge backend server running

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd torrentedge-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the API endpoint (if needed):
   - Update the base URL in `services/api.ts` to point to your TorrentEdge backend

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Build for Production

```bash
npm run build
```

The production-ready files will be generated in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
torrentedge-dashboard/
├── components/          # Reusable React components
│   ├── Navbar.tsx
│   ├── StatsSection.tsx
│   └── TorrentCard.tsx
├── pages/              # Page components
│   ├── Dashboard.tsx
│   └── LoginPage.tsx
├── services/           # API service layer
│   └── api.ts
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
