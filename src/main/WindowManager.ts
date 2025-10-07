import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { OverlayPosition } from '../shared/types';

export class WindowManager {
  private overlayWindow: BrowserWindow | null = null;
  private isOverlayVisible: boolean = false;

  /**
   * Creates a new overlay window with transparency and click-through options
   */
  public createOverlayWindow(): BrowserWindow {
    if (this.overlayWindow) {
      this.overlayWindow.close();
    }

    // Get primary display dimensions for positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Create overlay window with proper overlay properties (cross-platform)
    const windowOptions: any = {
      width: 500, // Wider for rectangular layout
      height: 180, // Shorter for 3-line layout
      minWidth: 400, // Minimum width
      minHeight: 150, // Minimum height
      maxWidth: 800, // Maximum width
      maxHeight: 300, // Maximum height
      x: Math.floor(screenWidth - 370), // Position near right edge with margin
      y: Math.floor(screenHeight / 2 - 125), // Center vertically
      frame: false, // Remove window frame for overlay
      transparent: true, // Enable transparency for overlay
      alwaysOnTop: true, // Keep on top of other windows
      skipTaskbar: true, // Don't show in taskbar
      resizable: true, // Allow resizing
      minimizable: false, // Prevent minimizing
      maximizable: false, // Prevent maximizing
      closable: true, // Allow closing
      focusable: true, // Allow focus so it can be moved
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false,
        backgroundThrottling: false // Prevent throttling when not focused
      },
      show: false, // Don't show immediately, we'll control this manually
    };

    // Platform-specific configurations
    if (process.platform === 'win32') {
      // Windows-specific optimizations
      windowOptions.titleBarStyle = 'hidden'; // Better for Windows
      windowOptions.thickFrame = false; // Remove thick frame on Windows
    } else if (process.platform === 'darwin') {
      // macOS-specific optimizations
      windowOptions.titleBarStyle = 'customButtonsOnHover';
      windowOptions.vibrancy = 'under-window'; // macOS vibrancy effect
    } else {
      // Linux and other platforms
      windowOptions.titleBarStyle = 'hidden';
    }

    this.overlayWindow = new BrowserWindow(windowOptions);

    // Configure click-through behavior initially disabled
    this.setClickThrough(false);

    // Load the new working overlay
    const overlayPath = path.join(__dirname, 'overlay-new.html');
    console.log('Loading NEW overlay from file:', overlayPath);
    this.overlayWindow.loadFile(overlayPath);

    // Add error handling for overlay loading
    this.overlayWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Overlay failed to load:', errorCode, errorDescription);
    });

    this.overlayWindow.webContents.on('did-finish-load', () => {
      console.log('Overlay loaded successfully');
      // Open DevTools for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        this.overlayWindow?.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // Handle window events
    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
      this.isOverlayVisible = false;
    });

    // Allow the window to be moved by dragging

    // Window is created but not shown yet
    this.isOverlayVisible = false;

    return this.overlayWindow;
  }

  /**
   * Sets overlay properties for transparency and click-through behavior
   */
  public setOverlayProperties(transparent: boolean, clickThrough: boolean): void {
    if (!this.overlayWindow) {
      throw new Error('Overlay window not created. Call createOverlayWindow() first.');
    }

    // Set transparency (requires window recreation for some platforms)
    if (transparent !== this.overlayWindow.isVisible()) {
      // Note: Transparency is set during window creation
      // Runtime changes may require window recreation on some platforms
    }

    // Set click-through behavior
    this.setClickThrough(clickThrough);
  }

  /**
   * Positions the overlay window at specified coordinates
   */
  public positionOverlay(position: OverlayPosition): void {
    if (!this.overlayWindow) {
      throw new Error('Overlay window not created. Call createOverlayWindow() first.');
    }

    // Validate position against screen bounds
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const validatedPosition = {
      x: Math.max(0, Math.min(position.x, screenWidth - position.width)),
      y: Math.max(0, Math.min(position.y, screenHeight - position.height)),
      width: Math.max(200, Math.min(position.width, screenWidth)),
      height: Math.max(150, Math.min(position.height, screenHeight))
    };

    this.overlayWindow.setBounds(validatedPosition);
  }

  /**
   * Toggles overlay window visibility
   */
  public toggleOverlayVisibility(): void {
    console.log('WindowManager: toggleOverlayVisibility called');
    console.log('Current overlay window:', this.overlayWindow ? 'exists' : 'null');
    console.log('Current visibility:', this.isOverlayVisible);
    
    if (!this.overlayWindow) {
      console.log('Creating new overlay window...');
      this.createOverlayWindow();
      setTimeout(() => {
        if (this.overlayWindow) {
          this.overlayWindow.show();
          this.overlayWindow.focus();
          this.isOverlayVisible = true;
          console.log('New overlay window shown');
        }
      }, 50);
      return;
    }

    // Use the actual window visibility instead of our state variable
    const actuallyVisible = this.overlayWindow.isVisible();
    console.log('Actual window visibility:', actuallyVisible);
    
    if (actuallyVisible) {
      console.log('Hiding overlay...');
      this.overlayWindow.hide();
      this.isOverlayVisible = false;
      console.log('Overlay hidden');
    } else {
      console.log('Showing overlay...');
      this.overlayWindow.show();
      this.overlayWindow.focus();
      this.isOverlayVisible = true;
      console.log('Overlay shown');
    }
  }

  /**
   * Shows the overlay window
   */
  public showOverlay(): void {
    console.log('WindowManager: showOverlay called');
    
    if (this.overlayWindow && !this.isOverlayVisible) {
      console.log('Showing overlay window...');
      this.overlayWindow.show();
      this.isOverlayVisible = true;
      console.log('Overlay window shown');
    } else if (!this.overlayWindow) {
      console.log('No overlay window available to show');
    } else {
      console.log('Overlay already visible');
    }
  }

  /**
   * Hides the overlay window
   */
  public hideOverlay(): void {
    if (this.overlayWindow && this.isOverlayVisible) {
      this.overlayWindow.hide();
      this.isOverlayVisible = false;
    }
  }

  /**
   * Gets the current overlay window instance
   */
  public getOverlayWindow(): BrowserWindow | null {
    return this.overlayWindow;
  }

  /**
   * Checks if overlay is currently visible
   */
  public isVisible(): boolean {
    return this.isOverlayVisible && this.overlayWindow !== null;
  }

  /**
   * Closes and destroys the overlay window
   */
  public destroyOverlay(): void {
    if (this.overlayWindow) {
      this.overlayWindow.close();
      this.overlayWindow = null;
      this.isOverlayVisible = false;
    }
  }

  /**
   * Sets click-through behavior for the overlay window
   */
  private setClickThrough(enabled: boolean): void {
    if (!this.overlayWindow) return;

    if (enabled) {
      // Enable click-through - mouse events pass through to underlying windows
      this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      // Disable click-through - window can receive mouse events
      this.overlayWindow.setIgnoreMouseEvents(false);
    }
  }

  /**
   * Centers the overlay on the primary display
   */
  public centerOverlay(): void {
    if (!this.overlayWindow) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const bounds = this.overlayWindow.getBounds();

    const centeredPosition: OverlayPosition = {
      x: Math.floor((screenWidth - bounds.width) / 2),
      y: Math.floor((screenHeight - bounds.height) / 2),
      width: bounds.width,
      height: bounds.height
    };

    this.positionOverlay(centeredPosition);
  }

  /**
   * Positions overlay at a predefined location (top-right corner)
   */
  public positionTopRight(): void {
    if (!this.overlayWindow) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const bounds = this.overlayWindow.getBounds();

    const topRightPosition: OverlayPosition = {
      x: screenWidth - bounds.width - 20, // 20px margin from edge
      y: 20, // 20px from top
      width: bounds.width,
      height: bounds.height
    };

    this.positionOverlay(topRightPosition);
  }
}