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
  .option('--skip-install', 'skip installing dependencies')
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

  console.log();
  console.log(`Creating a new Alith app in ${chalk.green(projectPath)}`);
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
  spinner.start('Downloading template...');
  try {
    // Clone the repository to a temporary directory
    const tempDir = path.join(require('os').tmpdir(), `alith-template-${Date.now()}`);
    
    execSync(`git clone https://github.com/krnkiran22/scaffold-alith.git "${tempDir}"`, { 
      stdio: 'pipe' 
    });

    // Copy the template contents to the new project
    await fs.copy(tempDir, projectPath, {
      filter: (src, dest) => {
        const relativePath = path.relative(tempDir, src);
        // Skip .git, node_modules, and .env files
        return !relativePath.includes('.git') && 
               !relativePath.includes('node_modules') && 
               !relativePath.endsWith('.env');
      }
    });

    // Clean up temp directory
    await fs.remove(tempDir);
    
    spinner.succeed('Template downloaded');
  } catch (error) {
    spinner.fail('Failed to download template');
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

  // Install dependencies
  if (!options.skipInstall) {
    spinner.start('Installing dependencies...');
    try {
      execSync('npm install', { 
        cwd: projectPath, 
        stdio: 'pipe' 
      });
      spinner.succeed('Dependencies installed');
    } catch (error) {
      spinner.fail('Failed to install dependencies');
      console.error(chalk.red('You can install them manually by running: npm install'));
    }
  }

  // Success message
  console.log();
  console.log(chalk.green('✅ Success! Created'), chalk.cyan(projectName), chalk.green('at'), chalk.cyan(projectPath));
  console.log();
  console.log('Inside that directory, you can run several commands:');
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
  console.log('We suggest that you begin by typing:');
  console.log();
  console.log(chalk.cyan('  cd'), projectName);
  console.log(chalk.cyan('  npm run dev'));
  console.log();
  
  if (!apiKeyResponse.apiKey) {
    console.log(chalk.yellow('⚠️  Don\'t forget to add your Groq API key to the .env file!'));
    console.log(chalk.gray('   Get your free API key from: https://console.groq.com/keys'));
    console.log();
  }
  
  console.log('Happy coding! 🚀');
  console.log();
}
