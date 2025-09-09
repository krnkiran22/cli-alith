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
    'server.js': `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AlithAgent } from 'alith';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const alithAgent = new AlithAgent({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  provider: "groq"
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Received message:', message);
    
    const response = await alithAgent.prompt(message);
    res.json({ response });
  } catch (error) {
    console.error('Error getting AI response:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

app.listen(PORT, () => {
  console.log(\`Alith AI server running at http://localhost:\${PORT}\`);
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
    'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
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
            {\`messages.slice(1).map((message) => (
              <div key={message.id} className={\`flex \${message.sender === 'user' ? 'justify-end' : 'justify-start'}\`}>
                <div className={\`max-w-xs sm:max-w-sm px-3 sm:px-4 py-2 rounded-2xl shadow-sm \${
                  message.sender === 'user'
                    ? 'bg-gray-800 text-white border-0'
                    : 'bg-white text-gray-800 border border-gray-200'
                }\`}>
                  <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
                </div>
              </div>
            ))\`}

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
  
  for (const [filePath, content] of Object.entries(srcFiles)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }
}
