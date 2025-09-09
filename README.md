# Create Alith App

<div align="center">
  <img src="https://raw.githubusercontent.com/krnkiran22/alith/main/imgs/alith.png" alt="Alith Logo" width="120" height="120">
  
  <h3>🚀 The fastest way to create Alith AI-powered chat applications</h3>
  
  [![npm version](https://img.shields.io/npm/v/create-alith-app.svg)](https://www.npmjs.com/package/create-alith-app)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Downloads](https://img.shields.io/npm/dm/create-alith-app.svg)](https://www.npmjs.com/package/create-alith-app)
</div>

---

Create production-ready AI chat applications with zero configuration. Just like `create-react-app`, but for Alith AI-powered applications.

## ✨ Features

- 🤖 **Alith AI Agent** - Pre-configured with LLaMA 3.3 70B model
- ⚛️ **React 19** - Latest React with TypeScript support
- 🎨 **Tailwind CSS** - Modern utility-first styling
- ⚡ **Vite** - Lightning-fast development and building
- 🔧 **Express Backend** - Ready-to-use API server
- 📱 **Responsive Design** - Mobile-first approach
- 🚀 **Concurrent Development** - Frontend and backend together
- 🔐 **Environment Variables** - Secure API key management
- 📦 **Zero Configuration** - Works out of the box

## 🚀 Quick Start

Get started in three simple steps:

```bash
# 1. Create your app
npx create-alith-app my-chat-app

# 2. Navigate and install dependencies
cd my-chat-app
npm install

# 3. Start development
npm run dev
```

That's it! Your AI chat application is now running at `http://localhost:5173` 🎉

> **Note:** We recommend manual dependency installation to avoid potential native module conflicts on different systems.

## 📖 Usage

### Interactive Mode (Recommended)

```bash
npx create-alith-app
```

The CLI will guide you through the setup process with interactive prompts.

### Direct Creation

```bash
npx create-alith-app my-awesome-chat
```

### Advanced Options

```bash
npx create-alith-app my-app --skip-install --skip-git
```

## ⚙️ CLI Options

| Option              | Description           | Default   |
| ------------------- | --------------------- | --------- |
| `--template <name>` | Template to use       | `default` |
| `--help`            | Show help information | -         |
| `--version`         | Show version number   | -         |

> **Note:** Automatic dependency installation has been removed to prevent native module conflicts. Dependencies are installed manually by the user.

## 🎁 What You Get

Every new Alith app comes with:

### 🏗️ Project Structure

```
my-alith-app/
├── 📁 src/
│   ├── 📁 components/
│   │   └── 📄 ChatInterface.tsx    # Main chat component
│   ├── 📄 App.tsx                  # Root application
│   ├── 📄 main.tsx                 # React entry point
│   └── 📄 index.css                # Global styles
├── 📄 server.js                    # Express backend server
├── 📄 .env.example                 # Environment variables template
├── 📄 package.json                 # Dependencies and scripts
├── 📄 vite.config.ts               # Vite configuration
├── 📄 tailwind.config.js           # Tailwind CSS config
├── 📄 tsconfig.json                # TypeScript configuration
└── 📄 README.md                    # Project documentation
```

### 🛠️ Tech Stack

| Technology       | Purpose                 | Version |
| ---------------- | ----------------------- | ------- |
| **React**        | Frontend framework      | 19.x    |
| **TypeScript**   | Type safety             | Latest  |
| **Vite**         | Build tool & dev server | 7.x     |
| **Tailwind CSS** | Styling framework       | 3.x     |
| **Express**      | Backend API server      | 4.x     |
| **Alith**        | AI agent integration    | Latest  |
| **Groq**         | LLM API provider        | -       |

## 🏃‍♂️ Getting Started

### 1. Create Your App

```bash
npx create-alith-app my-chat-app
cd my-chat-app
```

### 2. Install Dependencies

```bash
npm install
```

> **Important:** Manual installation prevents native module conflicts and registry errors on different systems.

### 3. Set Up Environment

```bash
# Copy the environment template (if not automatically created)
cp .env.example .env

# Edit .env and add your Groq API key
# Get your free key at: https://console.groq.com/keys
```

Add your API key to `.env`:

```env
GROQ_API_KEY=your_actual_groq_api_key_here
```

### 4. Start Development

```bash
npm run dev
```

This starts both frontend (React) and backend (Express) servers concurrently:

- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend API**: http://localhost:3001

## 📜 Available Scripts

| Script             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | 🚀 Start both frontend and backend in development mode |
| `npm run frontend` | ⚛️ Start only the React development server             |
| `npm run server`   | 🔧 Start only the Express backend server               |
| `npm run build`    | 📦 Build the application for production                |
| `npm run preview`  | 👀 Preview the production build locally                |
| `npm run lint`     | 🔍 Run ESLint to check code quality                    |

## 🔑 API Key Setup

### Get Your Free Groq API Key

1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign up or log in to your account
3. Click "Create API Key"
4. Copy your new API key
5. Add it to your `.env` file

### Environment Variables

```env
# Required
GROQ_API_KEY=your_groq_api_key_here

# Optional
PORT=3001                    # Backend server port
VITE_API_URL=http://localhost:3001  # Frontend API URL
```

## 🎨 Customization

### Styling with Tailwind CSS

The app comes with Tailwind CSS pre-configured. Customize your design by:

1. **Editing `tailwind.config.js`** - Add custom colors, fonts, spacing
2. **Modifying components** - Update the chat interface in `src/components/ChatInterface.tsx`
3. **Global styles** - Add custom CSS in `src/index.css`

### AI Model Configuration

Change the AI model in `server.js`:

```javascript
const alithAgent = new AlithAgent({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile", // Change this model
  provider: "groq",
});
```

Available models:

- `llama-3.3-70b-versatile` (Default)
- `llama-3.1-70b-versatile`
- `mixtral-8x7b-32768`

## �️ Troubleshooting

### Common Issues

#### 1. **Dependency Installation Errors**

If you encounter errors during `npm install`:

**For Windows EPERM Errors (Permission Issues):**

```powershell
# Method 1: Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
npm install

# Method 2: Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Method 3: Use npm ci for clean install
npm ci

# Method 4: Install outside OneDrive (RECOMMENDED)
# Move project outside OneDrive folder to avoid file locking
# Example: C:\Dev\my-app instead of C:\Users\Name\OneDrive\Desktop\my-app
```

**For Registry Errors (404 Not Found):**

```powershell
# Method 1: Clear npm cache
npm cache clean --force
npm config set registry https://registry.npmjs.org/
npm install

# Method 2: Delete lock file and reinstall
Remove-Item package-lock.json -Force
npm install

# Method 3: Use different registry temporarily
npm install --registry https://registry.npmjs.org/

# Method 4: Install specific failing packages manually
npm install debug@latest --save
npm install
```

**For OneDrive File Locking Issues:**

```powershell
# Best Solution: Create project outside OneDrive
cd C:\
mkdir Dev
cd Dev
npx create-alith-app my-app
cd my-app
npm install

# Alternative: Temporarily pause OneDrive sync
# Right-click OneDrive icon → Pause syncing → 2 hours
# Then run npm install
```

#### 2. **Native Module Compilation Issues**

For EPERM or compilation errors with the Alith package:

```bash
# Install build tools (Windows)
npm install --global windows-build-tools

# Install build tools (macOS)
xcode-select --install

# Install build tools (Linux)
sudo apt-get install build-essential
```

#### 3. **API Key Issues**

- Ensure your `.env` file exists and contains: `GROQ_API_KEY=your_key_here`
- Get a free API key from [Groq Console](https://console.groq.com/keys)
- Restart the server after adding the API key

#### 4. **Port Already in Use**

```bash
# Kill processes on ports 3001 and 5173
npx kill-port 3001 5173

# Or use different ports in package.json scripts
```

#### 5. **Git Clone Issues**

If template download fails:

- Check your internet connection
- Ensure Git is installed and accessible
- Try again after a few minutes

### Getting Help

- 📖 **Documentation**: [Alith Docs](https://github.com/krnkiran22/alith)
- 🐛 **Issues**: [Report a Bug](https://github.com/krnkiran22/alith/issues)
- 💬 **Community**: [Discussions](https://github.com/krnkiran22/alith/discussions)

## �🚀 Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy the `dist` folder
```

### Backend (Railway/Render)

The `server.js` file is ready for deployment. Make sure to:

1. Set environment variables in your hosting platform
2. Update CORS settings for production domains

### Full-Stack (Railway)

```bash
# Add this to package.json scripts:
"start": "node server.js"
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

```bash
git clone https://github.com/krnkiran22/alith.git
cd create-alith-app
npm install
npm link  # Link for local testing
```

## 📝 Examples

### Basic Chat

```typescript
// src/components/ChatInterface.tsx
const handleSendMessage = async (message: string) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = await response.json();
  return data.response;
};
```

### Custom Prompt

```javascript
// server.js
const response = await alithAgent.chat(
  `You are a helpful assistant. ${userMessage}`,
  { temperature: 0.7 }
);
```

## 🐛 Troubleshooting

### Common Issues

**Q: "Module not found" errors**  
A: Run `npm install` to install dependencies

**Q: API key not working**  
A: Check your `.env` file and ensure the key is correct

**Q: Backend not starting**  
A: Make sure port 3001 is available or change it in `.env`

**Q: Build fails**  
A: Check TypeScript errors with `npm run lint`

### Getting Help

- 📖 [Documentation](https://github.com/krnkiran22/alith)
- 🐛 [Report Issues](https://github.com/krnkiran22/alith/issues)
- 💬 [Discussions](https://github.com/krnkiran22/alith/discussions)

## 📄 License

MIT License - see [LICENSE](https://github.com/krnkiran22/alith/blob/main/LICENSE) for details.

## 🙏 Acknowledgments

- [Alith AI](https://github.com/krnkiran22/alith) - The AI agent framework
- [Groq](https://groq.com) - Lightning-fast LLM inference
- [React](https://react.dev) - The library for web interfaces
- [Vite](https://vitejs.dev) - Next generation frontend tooling

---

<div align="center">
  <p>Made with ❤️ by the Alith team</p>
  <p>⭐ Star us on <a href="https://github.com/krnkiran22/alith">GitHub</a> if you like this project!</p>
</div>
