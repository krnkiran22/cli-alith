#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const prompts = require('prompts');
const validateProjectName = require('validate-npm-package-name');
const { execSync } = require('child_process');

const program = new Command();

// Package info
const packageJson = require('../package.json');

program
  .name('create-alith-app')
  .description('Create a new Alith AI chat application')
  .version(packageJson.version)
  .argument('[project-name]', 'name of the project')
  .option('-t, --template <template>', 'template to use', 'default')
  .action(async (projectName, options) => {
    await createApp(projectName, options);
  });

program.parse();

async function createApp(projectName, options) {
  console.log();
  console.log(chalk.cyan('🤖 Create Alith App'));
  console.log(chalk.gray('Creating a new Alith AI chat application...'));
  console.log();

  // Get project name if not provided
  if (!projectName) {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'What is your project name?',
      initial: 'my-alith-app',
      validate: (value) => {
        const validation = validateProjectName(value);
        if (validation.validForNewPackages) {
          return true;
        }
        return validation.errors?.[0] || validation.warnings?.[0] || 'Invalid project name';
      }
    });

    if (!response.projectName) {
      console.log();
      console.log(chalk.red('Operation cancelled.'));
      process.exit(1);
    }

    projectName = response.projectName;
  }

  // Validate project name
  const validation = validateProjectName(projectName);
  if (!validation.validForNewPackages) {
    console.error(
      chalk.red(`Cannot create a project named ${chalk.green(`"${projectName}"`)} because of npm naming restrictions:`)
    );
    if (validation.errors) {
      validation.errors.forEach(error => console.error(chalk.red(`  • ${error}`)));
    }
    if (validation.warnings) {
      validation.warnings.forEach(warning => console.error(chalk.yellow(`  • ${warning}`)));
    }
    process.exit(1);
  }

  const projectPath = path.resolve(projectName);

  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(chalk.red(`Directory ${chalk.green(projectName)} already exists!`));
    process.exit(1);
  }

  // Ask for API key
  const apiKeyResponse = await prompts({
    type: 'password',
    name: 'apiKey',
    message: 'Enter your Groq API key (optional, you can add it later):',
    hint: 'Get your free API key from https://console.groq.com/keys'
  });

  return await createProject(projectPath, projectName, apiKeyResponse);
}

async function createProject(projectPath, projectName, apiKeyResponse) {
  const relativeProjectPath = path.relative(process.cwd(), projectPath);
  const displayPath = relativeProjectPath || projectName;
  
  console.log();
  console.log(`Creating a new Alith app in ${chalk.green(displayPath)}`);
  console.log();

  // Create project directory
  const spinner = ora('Creating project directory...').start();
  try {
    await fs.ensureDir(projectPath);
    spinner.succeed('Project directory created');
  } catch (error) {
    spinner.fail('Failed to create project directory');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // Download template
  spinner.start('Creating template...');
  try {
    // Create template directly without external downloads
    await createBasicTemplate(projectPath, projectName);
    spinner.succeed('Template created');
  } catch (error) {
    spinner.fail('Failed to create template');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // Update package.json with project name
  spinner.start('Configuring project...');
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageData = await fs.readJson(packageJsonPath);
    packageData.name = projectName;
    await fs.writeJson(packageJsonPath, packageData, { spaces: 2 });
    
    // Setup .env file with API key if provided
    if (apiKeyResponse.apiKey) {
      const envPath = path.join(projectPath, '.env');
      const envExamplePath = path.join(projectPath, '.env.example');
      
      if (fs.existsSync(envExamplePath)) {
        let envContent = await fs.readFile(envExamplePath, 'utf8');
        envContent = envContent.replace('your_groq_api_key_here', apiKeyResponse.apiKey);
        await fs.writeFile(envPath, envContent);
      }
    }
    
    spinner.succeed('Project configured');
  } catch (error) {
    spinner.fail('Failed to configure project');
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // Auto-install dependencies with robust error handling
  const installResponse = await prompts({
    type: 'confirm',
    name: 'install',
    message: 'Would you like to install dependencies now? (Recommended)',
    initial: true
  });

  if (installResponse.install) {
    const installSuccess = await installDependenciesWithFallback(projectPath, displayPath, spinner);
    if (installSuccess) {
      return; // Auto-install succeeded, no need for manual instructions
    }
  }

  // Success message for manual installation
  console.log();
  console.log(chalk.green('✅ Success! Created'), chalk.cyan(projectName), chalk.green('at'), chalk.cyan(displayPath));
  console.log();
  console.log(chalk.yellow('📦 Next Steps:'));
  console.log();
  console.log('1. Navigate to your project:');
  console.log(chalk.cyan(`   cd ${displayPath}`));
  console.log();
  console.log('2. Install dependencies:');
  console.log(chalk.cyan('   npm install'));
  
  // Add Windows-specific troubleshooting if needed
  if (process.platform === 'win32') {
    console.log();
    console.log(chalk.gray('   If npm install fails on Windows:'));
    console.log(chalk.gray('   • Run PowerShell as Administrator'));
    console.log(chalk.gray('   • Clear cache: npm cache clean --force'));
    console.log(chalk.gray('   • Avoid OneDrive folders for projects'));
  }
  
  console.log();
  console.log('3. Start development:');
  console.log(chalk.cyan('   npm run dev'));
  console.log();
  console.log(chalk.gray('Available commands:'));
  console.log();
  console.log(chalk.cyan('  npm run dev'));
  console.log('    Starts both frontend and backend development servers.');
  console.log();
  console.log(chalk.cyan('  npm run frontend'));
  console.log('    Starts only the React frontend development server.');
  console.log();
  console.log(chalk.cyan('  npm run server'));
  console.log('    Starts only the Alith AI backend server.');
  console.log();
  console.log(chalk.cyan('  npm run build'));
  console.log('    Builds the app for production.');
  console.log();
  
  if (!apiKeyResponse.apiKey) {
    console.log(chalk.yellow('⚠️  Important: Add your Groq API key to the .env file before running the app!'));
    console.log(chalk.gray('   Get your free API key from: https://console.groq.com/keys'));
    console.log();
  }
  
  // Additional troubleshooting note for Windows users
  if (process.platform === 'win32' && (currentDir.includes('OneDrive') || currentDir.includes('onedrive'))) {
    console.log(chalk.yellow('💡 Troubleshooting Tip:'));
    console.log(chalk.gray('   If you encounter EPERM errors during npm install,'));
    console.log(chalk.gray('   try moving your project outside OneDrive or run:'));
    console.log(chalk.cyan('   npm cache clean --force && npm install'));
    console.log();
  }
  
  console.log(chalk.magenta('🤖 Happy coding with Alith AI! 🚀'));
  console.log();
}

async function installDependenciesWithFallback(projectPath, displayPath, spinner) {
  const installMethods = [
    {
      name: 'Standard npm install',
      command: 'npm install',
      description: 'Using standard npm installation'
    },
    {
      name: 'Clean install with cache clear',
      command: 'npm cache clean --force && npm install',
      description: 'Clearing cache and reinstalling'
    },
    {
      name: 'Registry reset with clean install',
      command: 'npm config set registry https://registry.npmjs.org/ && npm cache clean --force && npm install',
      description: 'Resetting registry and cache'
    },
    {
      name: 'CI clean install',
      command: 'npm ci',
      description: 'Using npm ci for clean install'
    },
    {
      name: 'Legacy peer deps install',
      command: 'npm install --legacy-peer-deps',
      description: 'Installing with legacy peer dependencies'
    },
    {
      name: 'Force install',
      command: 'npm install --force',
      description: 'Force installing all packages'
    }
  ];

  for (let i = 0; i < installMethods.length; i++) {
    const method = installMethods[i];
    
    try {
      spinner.start(`${method.description}...`);
      
      // Split compound commands
      const commands = method.command.split(' && ');
      
      for (const cmd of commands) {
        execSync(cmd.trim(), { 
          cwd: projectPath, 
          stdio: 'pipe',
          timeout: 120000 // 2 minute timeout
        });
      }
      
      spinner.succeed('Dependencies installed successfully! ✨');
      
      // Success message with auto-install
      console.log();
      console.log(chalk.green('🎉 All set! Your Alith AI app is ready to go!'));
      console.log();
      console.log(chalk.yellow('🚀 Quick Start:'));
      console.log();
      console.log('1. Navigate to your project:');
      console.log(chalk.cyan(`   cd ${displayPath}`));
      console.log();
      console.log('2. Start development:');
      console.log(chalk.cyan('   npm run dev'));
      console.log();
      console.log(chalk.magenta('🤖 Happy coding with Alith AI! 🚀'));
      console.log();
      return true;
      
    } catch (error) {
      spinner.fail(`${method.name} failed`);
      
      if (i < installMethods.length - 1) {
        console.log(chalk.yellow(`Trying alternative method (${i + 2}/${installMethods.length})...`));
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      } else {
        // All methods failed
        console.log();
        console.log(chalk.red('😞 All automatic installation methods failed.'));
        console.log();
        console.log(chalk.yellow('🛠️  Manual Installation Guide:'));
        console.log();
        console.log('1. Navigate to your project:');
        console.log(chalk.cyan(`   cd ${displayPath}`));
        console.log();
        console.log('2. Try these commands in order:');
        console.log(chalk.cyan('   npm cache clean --force'));
        console.log(chalk.cyan('   Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue'));
        console.log(chalk.cyan('   Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue'));
        console.log(chalk.cyan('   npm install'));
        console.log();
        console.log('3. If still failing, try:');
        console.log(chalk.cyan('   npm install --legacy-peer-deps'));
        console.log();
        console.log('4. Or use Yarn instead:');
        console.log(chalk.cyan('   npm install -g yarn'));
        console.log(chalk.cyan('   yarn install'));
        console.log();
        console.log(chalk.gray('Common causes: Antivirus software, corporate firewalls, Windows file locks'));
        console.log();
        return false;
      }
    }
  }
}

async function createBasicTemplate(projectPath, projectName) {
  // Create basic template structure when download fails
  const templateFiles = {
    'package.json': {
      "name": projectName,
      "private": true,
      "version": "0.0.0",
      "type": "module",
      "scripts": {
        "dev": "concurrently \"npm run server\" \"npm run frontend\" --names \"🔧SERVER,⚛️FRONTEND\" --prefix-colors \"yellow,cyan\"",
        "frontend": "vite",
        "server": "node server.js",
        "build": "vite build",
        "preview": "vite preview"
      },
      "dependencies": {
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "alith": "latest",
        "express": "^4.21.1",
        "cors": "^2.8.5",
        "dotenv": "^16.4.7"
      },
      "devDependencies": {
        "@eslint/js": "^9.15.0",
        "@types/react": "^19.0.1",
        "@types/react-dom": "^19.0.2",
        "@vitejs/plugin-react": "^4.3.4",
        "autoprefixer": "^10.4.20",
        "concurrently": "^9.1.0",
        "eslint": "^9.15.0",
        "eslint-plugin-react-hooks": "^5.0.0",
        "eslint-plugin-react-refresh": "^0.4.14",
        "globals": "^15.12.0",
        "postcss": "^8.5.0",
        "tailwindcss": "^3.4.15",
        "typescript": "~5.6.2",
        "vite": "^7.1.5"
      }
    },
    'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})`,
    'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}`,
    'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
    'postcss.config.mjs': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    '.env.example': 'GROQ_API_KEY=your_groq_api_key_here',
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alith AI Chat</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    'server.js': `import { Agent } from 'alith';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3001;

// Initialize Alith agent
const agent = new Agent({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  baseUrl: "https://api.groq.com/openai/v1",
});

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Received message:', message);
    
    // Use Alith agent to get response
    const response = await agent.prompt(message);
    
    console.log('AI response:', response);
    
    res.json({ response });
  } catch (error) {
    console.error('Error getting AI response:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Alith AI server is running' });
});

app.listen(port, () => {
  console.log(\`Alith AI server running at http://localhost:\${port}\`);
});`
  };

  // Create directories
  await fs.ensureDir(path.join(projectPath, 'src'));

  // Write template files
  for (const [filePath, content] of Object.entries(templateFiles)) {
    const fullPath = path.join(projectPath, filePath);
    if (typeof content === 'object') {
      await fs.writeJson(fullPath, content, { spaces: 2 });
    } else {
      await fs.writeFile(fullPath, content);
    }
  }

  // Create React components
  const srcFiles = {
    'src/main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`,
    'src/App.tsx': `import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ChatInterface from './components/ChatInterface'

function App() {
  const [count, setCount] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-center gap-8 mb-8">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        This is the scaffold for the Alith React app. You can configure it according to your requirements.
      </p>

      {/* Chat Icon */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50 flex items-center justify-center group"
        >
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700 group-hover:scale-110 transition-transform " fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4-8 9-8s9 3.582 9 8z" />
          </svg>
          
          {/* Pulse Animation */}
          <div className="absolute inset-0 rounded-full bg-white opacity-50 animate-ping"></div>
        </button>
      )}

      {/* Chat Interface */}
      <ChatInterface 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  )
}

export default App`,
    'src/index.css': `@import "tailwindcss";

:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}`,
    'src/App.css': `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}`,
    'src/components/ChatInterface.tsx': `import React, { useState, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

// Browser-compatible function that calls our local Alith server
const getAlithResponse = async (message: string): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(\`Server responded with \${response.status}: \${response.statusText}\`);
    }

    const data = await response.json();
    return data.response || 'No response received';
  } catch (error) {
    console.error('Error calling Alith server:', error);
    throw error;
  }
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm Alith AI Assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      // Use Alith server for AI response
      const aiResponse = await getAlithResponse(currentInput);
      
      const botResponse: Message = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback response if AI fails
      const fallbackResponse: Message = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, fallbackResponse]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 z-50 flex items-end justify-center sm:block p-4 sm:p-0">
      {/* Chat Modal */}
      <div className="relative bg-white shadow-2xl w-full max-w-md sm:w-[420px] h-full max-h-[90vh] sm:h-[600px] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden border border-gray-200">
        {/* Chat Header */}
        <div className="bg-gray-800 p-4 sm:p-6 flex justify-between items-center">
          <div className="flex items-center">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Alith AI</h3>
              <p className="text-gray-300 text-xs sm:text-sm">AI Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div id="messages-container" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          <div className="space-y-3 sm:space-y-4">
            {/* Initial Bot Message */}
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 sm:px-5 py-3 sm:py-4 shadow-sm border border-gray-200 max-w-xs sm:max-w-md">
                <div className="mb-3 sm:mb-4">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base mb-2">Hello! I'm Alith AI Assistant</h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    I'm here to provide intelligent assistance and guidance. How can I help you today?
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 text-blue-700 mb-2">
                    <span className="text-base sm:text-lg">⚡</span>
                    <span className="font-semibold text-xs sm:text-sm">AI Spotlight</span>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600 leading-relaxed">
                    I can help you with various tasks and provide intelligent assistance across multiple domains!
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Messages */}
            {messages.slice(1).map((message) => (
              <div key={message.id} className={\`flex \${message.sender === 'user' ? 'justify-end' : 'justify-start'}\`}>
                <div className={\`max-w-xs sm:max-w-sm px-3 sm:px-4 py-2 rounded-2xl shadow-sm \${
                  message.sender === 'user'
                    ? 'bg-gray-800 text-white border-0'
                    : 'bg-white text-gray-800 border border-gray-200'
                }\`}>
                  <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-200">
          {/* Input Field with Send Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-2 py-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-sm sm:text-base"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg sm:rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;`
  };

  // Create src directory and files
  await fs.ensureDir(path.join(projectPath, 'src/components'));
  await fs.ensureDir(path.join(projectPath, 'src/assets'));
  await fs.ensureDir(path.join(projectPath, 'public'));
  
  for (const [filePath, content] of Object.entries(srcFiles)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }

  // Add React logo (SVG)
  const reactLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-11.769-62.708c-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 0 0-6.375 5.848a155.866 155.866 0 0 0-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233C50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 0 0 1.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 0 0 6.921 2.165a167.467 167.467 0 0 0-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266c13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 0 0 5.342-4.923a168.064 168.064 0 0 0 6.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586c13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 0 0-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488c29.348-9.723 48.443-25.443 48.443-41.52c0-15.417-17.868-30.326-45.517-39.844Zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345c-3.24-10.257-7.612-21.163-12.963-32.432c5.106-11 9.31-21.767 12.459-31.957c2.619.758 5.16 1.557 7.61 2.4c23.69 8.156 38.14 20.213 38.14 29.504c0 9.896-15.606 22.743-40.946 31.14Zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787c-1.524 8.219-4.59 13.698-8.382 15.893c-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 0 1-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246c12.376-1.098 24.068-2.894 34.671-5.345a134.17 134.17 0 0 1 1.386 6.193ZM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675c-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 0 1 1.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994c7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 0 1-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94ZM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863c-6.35-5.437-9.555-10.836-9.555-15.216c0-9.322 13.897-21.212 37.076-29.293c2.813-.98 5.757-1.905 8.812-2.773c3.204 10.42 7.406 21.315 12.477 32.332c-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 0 1-6.318-1.979Zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789c8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 0 1 3.841 3.545c-7.438 7.987-14.787 17.08-21.808 26.988c-12.04 1.116-23.565 2.908-34.161 5.309a160.342 160.342 0 0 1-1.76-7.887Zm110.427 27.268a347.8 347.8 0 0 0-7.785-12.803c8.168 1.033 15.994 2.404 23.343 4.08c-2.206 7.072-4.956 14.465-8.193 22.045a381.151 381.151 0 0 0-7.365-13.322Zm-45.032-43.861c5.044 5.465 10.096 11.566 15.065 18.186a322.04 322.04 0 0 0-30.257-.006c4.974-6.559 10.069-12.652 15.192-18.18ZM82.802 87.83a323.167 323.167 0 0 0-7.227 13.238c-3.184-7.553-5.909-14.98-8.134-22.152c7.304-1.634 15.093-2.97 23.209-3.984a321.524 321.524 0 0 0-7.848 12.897Zm8.081 65.352c-8.385-.936-16.291-2.203-23.593-3.793c2.26-7.3 5.045-14.885 8.298-22.6a321.187 321.187 0 0 0 7.257 13.246c2.594 4.48 5.28 8.868 8.038 13.147Zm37.542 31.03c-5.184-5.592-10.354-11.779-15.403-18.433c4.902.192 9.899.29 14.978.29c5.218 0 10.376-.117 15.453-.343c-4.985 6.774-10.018 12.97-15.028 18.486Zm52.198-57.817c3.422 7.8 6.306 15.345 8.596 22.52c-7.422 1.694-15.436 3.058-23.88 4.071a382.417 382.417 0 0 0 7.859-13.026a347.403 347.403 0 0 0 7.425-13.565Zm-16.898 8.101a358.557 358.557 0 0 1-12.281 19.815a329.4 329.4 0 0 1-23.444.823c-7.967 0-15.716-.248-23.178-.732a310.202 310.202 0 0 1-12.513-19.846h.001a307.41 307.41 0 0 1-10.923-20.627a310.278 310.278 0 0 1 10.89-20.637l-.001.001a307.318 307.318 0 0 1 12.413-19.761c7.613-.576 15.42-.876 23.31-.876H128c7.926 0 15.743.303 23.354.883a329.357 329.357 0 0 1 12.335 19.695a358.489 358.489 0 0 1 11.036 20.54a329.472 329.472 0 0 1-11 20.722Zm22.56-122.124c8.572 4.944 11.906 24.881 6.52 51.026c-.344 1.668-.73 3.367-1.15 5.09c-10.622-2.452-22.155-4.275-34.23-5.408c-7.034-10.017-14.323-19.124-21.64-27.008a160.789 160.789 0 0 1 5.888-5.4c18.9-16.447 36.564-22.941 44.612-18.3ZM128 90.808c12.625 0 22.86 10.235 22.86 22.86s-10.235 22.86-22.86 22.86s-22.86-10.235-22.86-22.86s10.235-22.86 22.86-22.86Z"></path></svg>`;
  
  const viteLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>`;

  await fs.writeFile(path.join(projectPath, 'src/assets/react.svg'), reactLogoSvg);
  await fs.writeFile(path.join(projectPath, 'public/vite.svg'), viteLogoSvg);
}
