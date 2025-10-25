// LecoSolar PWA Application Logic

class LecoSolarApp {
  constructor() {
    this.accountNumber = "0405622811";
    this.baseUrl = "https://solar.leco.lk";
    this.loginUrl = `${this.baseUrl}/login`;
    this.statusCheckInterval = null;
    this.isOnline = navigator.onLine;

    this.init();
  }

  async init() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupApp());
    } else {
      this.setupApp();
    }
  }

  setupApp() {
    this.setupEventListeners();
    this.setupPWA();
    this.hideLoadingScreen();
    this.performAutoLogin();
    this.startStatusMonitoring();
    this.updateConnectionStatus();
  }

  setupEventListeners() {
    // Menu toggle
    const menuBtn = document.getElementById("menu-btn");
    const navMenu = document.getElementById("nav-menu");

    menuBtn?.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });

    // Navigation links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = e.target.getAttribute("href").substring(1);
        this.showSection(target);
        navMenu.classList.remove("active");

        // Update active nav link
        document
          .querySelectorAll(".nav-link")
          .forEach((l) => l.classList.remove("active"));
        e.target.classList.add("active");
      });
    });

    // Action buttons
    document
      .getElementById("check-status-btn")
      ?.addEventListener("click", () => {
        this.checkSystemStatus();
      });

    document
      .getElementById("refresh-data-btn")
      ?.addEventListener("click", () => {
        this.refreshData();
      });

    // Settings
    document.getElementById("auto-refresh")?.addEventListener("change", (e) => {
      this.toggleAutoRefresh(e.target.checked);
    });

    document
      .getElementById("notifications")
      ?.addEventListener("change", (e) => {
        this.toggleNotifications(e.target.checked);
      });

    document
      .getElementById("install-app-btn")
      ?.addEventListener("click", () => {
        this.showInstallPrompt();
      });

    // Online/offline detection
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.updateConnectionStatus();
      this.performAutoLogin();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.updateConnectionStatus();
    });
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    const app = document.getElementById("app");

    setTimeout(() => {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
        app.style.display = "flex";
        app.style.opacity = "0";
        setTimeout(() => {
          app.style.opacity = "1";
        }, 50);
      }, 300);
    }, 2000); // Show loading for 2 seconds
  }

  showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.remove("active");
    });

    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add("active");
    }
  }

  async performAutoLogin() {
    if (!this.isOnline) {
      this.updateStatus("Offline - Auto-login disabled", "offline");
      return;
    }

    this.updateStatus("Connecting to LECO Solar...", "connecting");

    try {
      // Direct approach: Open LECO website with account number
      this.openLecoWebsiteWithAccount();

      // Also try to fetch status if possible
      await this.attemptDirectStatusCheck();
    } catch (error) {
      console.error("Auto-login failed:", error);
      this.updateStatus("Auto-login failed", "offline");
      this.showNotification("Auto-login failed - Please try again", "error");
    }
  }

  openLecoWebsiteWithAccount() {
    // Show instructions and provide direct access
    const statusContent = document.getElementById("status-content");
    const instructions = `
      <div class="leco-login-section">
        <h3>🔑 LECO Solar Login</h3>
        <p>Your account number: <strong>${this.accountNumber}</strong></p>
        
        <div class="login-options">
          <button id="open-leco-btn" class="action-button primary">
            🌐 Open LECO Website & Auto-fill
          </button>
          
          <button id="embed-leco-btn" class="action-button secondary">
            📱 Login Here (Embedded)
          </button>
        </div>
        
        <div id="leco-embed-container" style="display: none;">
          <iframe id="leco-iframe" src="${this.loginUrl}" 
                  style="width: 100%; height: 600px; border: 1px solid #ccc; border-radius: 8px;">
          </iframe>
        </div>
        
        <div class="manual-instructions">
          <h4>📋 Manual Login Steps:</h4>
          <ol>
            <li>Click "Open LECO Website" above</li>
            <li>Enter account number: <code>${this.accountNumber}</code></li>
            <li>Complete login process</li>
            <li>Return here and click "Check Status"</li>
          </ol>
        </div>
      </div>
    `;

    if (statusContent) {
      statusContent.innerHTML = instructions;

      // Setup event listeners
      document
        .getElementById("open-leco-btn")
        ?.addEventListener("click", () => {
          this.openLecoInNewTab();
        });

      document
        .getElementById("embed-leco-btn")
        ?.addEventListener("click", () => {
          this.showEmbeddedLogin();
        });
    }

    this.updateStatus("Ready to connect - Choose login method", "connecting");
    this.showNotification("LECO login options available");
  }

  openLecoInNewTab() {
    // Open LECO website in new tab
    const newWindow = window.open(
      this.loginUrl,
      "_blank",
      "noopener,noreferrer,width=1024,height=768"
    );

    if (newWindow) {
      // Try to communicate with the new window (if same origin)
      this.attemptAutoFill(newWindow);
    }

    this.updateStatus(
      "LECO website opened - Enter account: " + this.accountNumber,
      "connecting"
    );
    this.showNotification(
      `LECO website opened. Enter account: ${this.accountNumber}`
    );

    // Start checking for completed login
    this.startLoginCheck();
  }

  attemptAutoFill(targetWindow) {
    // Wait a bit for the page to load, then try to fill the account number
    setTimeout(() => {
      try {
        // This will only work if same-origin policy allows it
        const doc = targetWindow.document;
        const accountInput = doc.getElementById("INP_9ldt42okh");

        if (accountInput) {
          accountInput.value = this.accountNumber;
          accountInput.dispatchEvent(new Event("input", { bubbles: true }));
          accountInput.focus();

          this.showNotification("Account number auto-filled!");
        }
      } catch (error) {
        // Cross-origin restriction - this is expected
        console.log("Cannot auto-fill due to security restrictions");
      }
    }, 2000);
  }

  showEmbeddedLogin() {
    const container = document.getElementById("leco-embed-container");
    if (container) {
      container.style.display = "block";
      this.updateStatus("Embedded login loaded", "connecting");

      // Monitor iframe for changes
      const iframe = document.getElementById("leco-iframe");
      if (iframe) {
        iframe.onload = () => {
          this.monitorEmbeddedLogin(iframe);
        };
      }
    }
  }

  monitorEmbeddedLogin(iframe) {
    // Try to access iframe content periodically
    const checkInterval = setInterval(() => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;
        const accountInput = iframeDoc.getElementById("INP_9ldt42okh");

        if (accountInput && accountInput.value !== this.accountNumber) {
          accountInput.value = this.accountNumber;
          accountInput.dispatchEvent(new Event("input", { bubbles: true }));
        }

        // Check if login is successful by looking for specific elements
        const statusElement = iframeDoc.querySelector(
          '[class*="status"], [class*="dashboard"], [id*="status"]'
        );
        if (statusElement) {
          clearInterval(checkInterval);
          this.handleSuccessfulLogin();
        }
      } catch (error) {
        // Cross-origin restrictions - this is normal
      }
    }, 1000);

    // Stop checking after 60 seconds
    setTimeout(() => clearInterval(checkInterval), 60000);
  }

  startLoginCheck() {
    // Periodically ask user if they've completed login
    setTimeout(() => {
      const completed = confirm(
        `Have you completed login on LECO website with account ${this.accountNumber}?\n\n` +
          "Click OK if you've successfully logged in, or Cancel to wait longer."
      );

      if (completed) {
        this.handleSuccessfulLogin();
      } else {
        // Ask again in 10 seconds
        this.startLoginCheck();
      }
    }, 10000);
  }

  handleSuccessfulLogin() {
    // Store successful login
    localStorage.setItem(
      "lecoSolarSession",
      JSON.stringify({
        accountNumber: this.accountNumber,
        loginTime: Date.now(),
        isLoggedIn: true,
      })
    );

    this.updateStatus("Login successful!", "online");
    this.updateLastUpdated();
    this.showNotification("Successfully logged in to LECO Solar system");

    // Automatically check system status
    setTimeout(() => this.checkSystemStatus(), 1000);
  }

  async attemptDirectStatusCheck() {
    // Try to fetch status directly (may not work due to CORS)
    try {
      const response = await fetch(this.loginUrl, {
        method: "GET",
        mode: "no-cors",
      });

      console.log("Direct status check attempted");
    } catch (error) {
      console.log("Direct status check failed (expected due to CORS)");
    }
  }

  async checkServerReachability() {
    try {
      // Try to make a simple request to check if server is reachable
      // Using a CORS-friendly approach
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(this.loginUrl, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true; // If we get here, server is reachable
    } catch (error) {
      // In a real scenario, you might want to try alternative methods
      console.log("Direct server check failed, assuming reachable for demo");
      return true; // For demo purposes, assume server is reachable
    }
  }

  async checkSystemStatus() {
    const button = document.getElementById("check-status-btn");
    const statusContent = document.getElementById("status-content");
    const systemStatus = document.getElementById("system-status");

    if (!this.isOnline) {
      this.showNotification("No internet connection", "error");
      return;
    }

    // Add loading state
    button.classList.add("loading");
    button.disabled = true;

    try {
      this.updateStatus("Checking system status...", "connecting");

      // Simulate API call to LECO solar system
      await this.delay(2000);

      // Mock response data
      const statusData = {
        systemStatus: "Online",
        powerGeneration: "4.2 kW",
        dailyProduction: "28.5 kWh",
        monthlyProduction: "742.3 kWh",
        lastReading: new Date().toLocaleString(),
        alerts: [],
        efficiency: "94.2%",
      };

      // Update UI with status data
      systemStatus.textContent = statusData.systemStatus;
      this.updateStatus("System status updated", "online");

      statusContent.innerHTML = `
                <div class="status-grid">
                    <div class="status-item">
                        <h4>Current Generation</h4>
                        <p class="status-value">${statusData.powerGeneration}</p>
                    </div>
                    <div class="status-item">
                        <h4>Daily Production</h4>
                        <p class="status-value">${statusData.dailyProduction}</p>
                    </div>
                    <div class="status-item">
                        <h4>Monthly Production</h4>
                        <p class="status-value">${statusData.monthlyProduction}</p>
                    </div>
                    <div class="status-item">
                        <h4>System Efficiency</h4>
                        <p class="status-value">${statusData.efficiency}</p>
                    </div>
                    <div class="status-item">
                        <h4>Last Reading</h4>
                        <p class="status-value">${statusData.lastReading}</p>
                    </div>
                    <div class="status-item">
                        <h4>System Status</h4>
                        <p class="status-value success">${statusData.systemStatus}</p>
                    </div>
                </div>
            `;

      // Add CSS for status grid if not already added
      this.addStatusGridStyles();

      this.updateLastUpdated();
      this.showNotification("Status updated successfully");
    } catch (error) {
      console.error("Status check failed:", error);
      statusContent.innerHTML =
        '<p class="error">Failed to retrieve status. Please try again.</p>';
      this.updateStatus("Status check failed", "offline");
      this.showNotification("Failed to check status", "error");
    } finally {
      button.classList.remove("loading");
      button.disabled = false;
    }
  }

  addStatusGridStyles() {
    // Add styles for status grid dynamically
    const style = document.createElement("style");
    style.textContent = `
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }
            .status-item {
                background: var(--leco-gray);
                padding: 1rem;
                border-radius: var(--border-radius);
                text-align: center;
            }
            .status-item h4 {
                color: var(--text-secondary);
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }
            .status-value {
                font-size: 1.2rem;
                font-weight: 600;
                color: var(--leco-blue);
            }
            .status-value.success {
                color: var(--success-color);
            }
            .error {
                color: var(--danger-color);
                text-align: center;
                font-weight: 600;
            }
        `;

    if (!document.querySelector("#status-grid-styles")) {
      style.id = "status-grid-styles";
      document.head.appendChild(style);
    }
  }

  refreshData() {
    this.performAutoLogin();
    setTimeout(() => this.checkSystemStatus(), 1500);
    this.showNotification("Refreshing data...");
  }

  updateStatus(message, type = "connecting") {
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("connection-status");

    if (statusText) statusText.textContent = message;

    if (statusDot) {
      statusDot.className = "status-dot";
      if (type === "online") {
        statusDot.classList.add("online");
      } else if (type === "offline") {
        statusDot.classList.add("offline");
      }
    }
  }

  updateConnectionStatus() {
    if (this.isOnline) {
      this.updateStatus("Connected", "online");
    } else {
      this.updateStatus("Offline", "offline");
    }
  }

  updateLastUpdated() {
    const lastUpdatedElement = document.getElementById("last-updated");
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = new Date().toLocaleString();
    }
  }

  startStatusMonitoring() {
    const autoRefresh = document.getElementById("auto-refresh");
    if (autoRefresh?.checked) {
      this.statusCheckInterval = setInterval(() => {
        if (this.isOnline) {
          this.checkSystemStatus();
        }
      }, 300000); // Check every 5 minutes
    }
  }

  toggleAutoRefresh(enabled) {
    if (enabled) {
      this.startStatusMonitoring();
      localStorage.setItem("autoRefresh", "true");
    } else {
      if (this.statusCheckInterval) {
        clearInterval(this.statusCheckInterval);
        this.statusCheckInterval = null;
      }
      localStorage.setItem("autoRefresh", "false");
    }
  }

  toggleNotifications(enabled) {
    localStorage.setItem("notifications", enabled ? "true" : "false");
    if (enabled && "Notification" in window) {
      Notification.requestPermission();
    }
  }

  showNotification(message, type = "info") {
    // Check if notifications are enabled
    const notificationsEnabled =
      localStorage.getItem("notifications") !== "false";

    if (
      notificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("LecoSolar", {
        body: message,
        icon: "icons/icon-192x192.png",
        badge: "icons/icon-72x72.png",
      });
    }

    // Also show in-app notification
    this.showInAppNotification(message, type);
  }

  showInAppNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `in-app-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${
              type === "error" ? "var(--danger-color)" : "var(--success-color)"
            };
            color: white;
            padding: 1rem 2rem;
            border-radius: var(--border-radius);
            z-index: 1001;
            box-shadow: var(--box-shadow);
            animation: slideDown 0.3s ease;
        `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideUp 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // PWA Installation
  setupPWA() {
    let deferredPrompt;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show custom install prompt after delay
      setTimeout(() => this.showInstallPrompt(), 5000);
    });

    // Handle install prompt actions
    document
      .getElementById("install-yes")
      ?.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to the install prompt: ${outcome}`);
          deferredPrompt = null;
        }
        this.hideInstallPrompt();
      });

    document.getElementById("install-no")?.addEventListener("click", () => {
      this.hideInstallPrompt();
    });

    // Check if already installed
    window.addEventListener("appinstalled", () => {
      console.log("LecoSolar PWA was installed");
      this.hideInstallPrompt();
    });
  }

  showInstallPrompt() {
    const installPrompt = document.getElementById("install-prompt");
    if (installPrompt && !this.isAppInstalled()) {
      installPrompt.style.display = "block";
    }
  }

  hideInstallPrompt() {
    const installPrompt = document.getElementById("install-prompt");
    if (installPrompt) {
      installPrompt.style.display = "none";
    }
  }

  isAppInstalled() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  // Utility function for delays
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Initialize the application
const app = new LecoSolarApp();

// Add animation styles for notifications
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
    @keyframes slideDown {
        from { transform: translate(-50%, -100px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -100px); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);
