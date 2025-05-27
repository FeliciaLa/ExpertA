const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Log current environment with more details
console.log('===== SERVER.JS STARTING =====');
console.log('Current directory:', process.cwd());
console.log('PATH:', process.env.PATH);
console.log('Node version:', process.version);
console.log('Environment variables:', Object.keys(process.env).sort());

// List all directories
console.log('Root directory contents:');
try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    try {
      const stats = fs.statSync(file);
      console.log(`${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
    } catch (error) {
      console.log(`${file} (error getting stats: ${error.message})`);
    }
  });
} catch (error) {
  console.error('Error listing root directory:', error);
}

// Check backend directory
if (fs.existsSync('backend')) {
  console.log('Backend directory contents:');
  try {
    const backendFiles = fs.readdirSync('backend');
    backendFiles.forEach(file => {
      try {
        const stats = fs.statSync(path.join('backend', file));
        console.log(`backend/${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
      } catch (error) {
        console.log(`backend/${file} (error getting stats: ${error.message})`);
      }
    });
  } catch (error) {
    console.error('Error listing backend directory:', error);
  }
} else {
  console.error('CRITICAL ERROR: Backend directory not found!');
}

// Check for Python installation
function checkCommand(command) {
  return new Promise((resolve) => {
    exec(`which ${command}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`${command} not found: ${error.message}`);
        resolve(false);
      } else {
        console.log(`${command} found at: ${stdout.trim()}`);
        resolve(true);
      }
    });
  });
}

// Set up environment variables
const port = process.env.PORT || 8000;
process.env.PYTHONPATH = process.env.PYTHONPATH || path.join(process.cwd(), 'backend');
console.log('PYTHONPATH:', process.env.PYTHONPATH);

// Main async function to check environment and run Django
async function main() {
  try {
    // Check Python installation
    const hasPython3 = await checkCommand('python3');
    const hasPython = await checkCommand('python');
    const pythonCommand = hasPython3 ? 'python3' : (hasPython ? 'python' : null);
    
    if (!pythonCommand) {
      console.error('CRITICAL ERROR: No Python installation found!');
      process.exit(1);
    }

    console.log(`Using Python command: ${pythonCommand}`);
    
    // Check Python version
    exec(`${pythonCommand} --version`, (error, stdout, stderr) => {
      console.log('Python version:', error ? stderr : stdout);
    });
    
    // Check manage.py exists
    const managePyPath = path.join('backend', 'manage.py');
    if (!fs.existsSync(managePyPath)) {
      console.error(`CRITICAL ERROR: manage.py not found at ${managePyPath}`);
      process.exit(1);
    }
    console.log(`manage.py found at: ${managePyPath}`);
    
    // Function to run Django command
    function runDjangoCommand(command, args = []) {
      console.log(`Running Django command: ${command} ${args.join(' ')}`);
      
      return new Promise((resolve, reject) => {
        const djangoProcess = spawn(pythonCommand, [managePyPath, command, ...args], {
          stdio: 'inherit',
          env: process.env
        });
        
        djangoProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`Django command ${command} completed successfully`);
            resolve();
          } else {
            console.error(`Django command ${command} failed with code ${code}`);
            resolve(); // Still resolve to continue with other commands
          }
        });
        
        djangoProcess.on('error', (err) => {
          console.error(`Failed to start Django command ${command}:`, err);
          resolve(); // Still resolve to continue with other commands
        });
      });
    }
    
    // Run migrations
    await runDjangoCommand('migrate');
    
    // Collect static files
    await runDjangoCommand('collectstatic', ['--noinput']);
    
    // Start Django server with health check
    console.log('Starting Django server...');
    const server = spawn(pythonCommand, [managePyPath, 'runserver', `0.0.0.0:${port}`], {
      stdio: 'inherit',
      env: process.env
    });
    
    server.on('close', (code) => {
      console.log(`Django server exited with code ${code}`);
      process.exit(code);
    });
    
    server.on('error', (err) => {
      console.error('Failed to start Django server:', err);
      process.exit(1);
    });
    
    // Handle signals
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        console.log(`Received ${signal}, shutting down...`);
        server.kill(signal);
      });
    });
    
    // Log server started
    console.log(`Django server started on port ${port}`);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Start the application
main().catch(error => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
}); 