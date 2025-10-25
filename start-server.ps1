# LecoSolar PWA - Local Development Server

# Simple HTTP server for testing PWA features locally
# Note: PWA features require HTTPS in production

# For Python 3 users:
# python -m http.server 8000

# For Node.js users (install http-server globally first):
# npm install -g http-server
# http-server -p 8000 -c-1

# For PHP users:
# php -S localhost:8000

Write-Host "LecoSolar PWA Development Server"
Write-Host "================================"
Write-Host ""
Write-Host "Choose a method to serve the PWA locally:"
Write-Host ""
Write-Host "1. Python 3 (recommended if you have Python installed):"
Write-Host "   python -m http.server 8000"
Write-Host ""
Write-Host "2. Node.js (if you have Node.js installed):"
Write-Host "   npm install -g http-server"
Write-Host "   http-server -p 8000 -c-1"
Write-Host ""
Write-Host "3. PHP (if you have PHP installed):"
Write-Host "   php -S localhost:8000"
Write-Host ""
Write-Host "After starting the server, open http://localhost:8000 in your browser"
Write-Host ""
Write-Host "Note: For full PWA testing on iOS, deploy to an HTTPS server"
Write-Host "Recommended: Netlify, Vercel, or GitHub Pages"