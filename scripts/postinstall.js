// Android-only patch — not needed for web/Vercel builds
if (process.env.VERCEL) {
  console.log('Skipping patch-package on Vercel (Android patch not needed for web build)');
  process.exit(0);
}

const { execSync } = require('child_process');
execSync('patch-package', { stdio: 'inherit', shell: true });
