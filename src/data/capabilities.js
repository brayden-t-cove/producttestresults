export const CAPABILITY_GROUPS = {
  hub: [
    { label: 'Connectivity', capabilities: [
      { id: 'z-wave', label: 'Z-Wave' },
      { id: 'rf-sensors', label: 'RF Sensors' },
      { id: 'wifi-devices', label: 'WiFi Devices' },
      { id: 'bluetooth', label: 'Bluetooth' },
    ]},
    { label: 'Hardware', capabilities: [
      { id: 'battery-backup', label: 'Battery Backup' },
      { id: 'cellular-backup', label: 'Cellular Backup' },
      { id: 'ethernet', label: 'Ethernet' },
      { id: 'wifi', label: 'WiFi' },
      { id: 'onboard-siren', label: 'Onboard Siren' },
    ]},
    { label: 'Peripherals Supported', capabilities: [
      { id: 'touchpad', label: 'Touchpad' },
      { id: 'keypad', label: 'Keypad' },
      { id: 'key-fob', label: 'Key Fob' },
      { id: 'rf-sensor-peripheral', label: 'RF Sensors' },
      { id: 'zwave-devices', label: 'Z-Wave Devices' },
    ]},
    { label: 'Integrations', capabilities: [
      { id: 'alexa', label: 'Amazon Alexa' },
      { id: 'google-home', label: 'Google Home' },
    ]},
    { label: 'Monitoring', capabilities: [
      { id: 'professional-monitoring', label: 'Professional Monitoring' },
      { id: 'self-monitoring', label: 'Self-Monitoring' },
    ]},
  ],
  touchpad: [
    { label: 'Connectivity', capabilities: [
      { id: 'bluetooth', label: 'Bluetooth' },
      { id: 'esp32', label: 'ESP-32' },
    ]},
    { label: 'Hardware', capabilities: [
      { id: 'battery-backup', label: 'Battery Backup' },
      { id: 'wifi', label: 'Wi-Fi' },
    ]},
  ],
  camera: [
    { label: 'Placement', capabilities: [
      { id: 'indoor', label: 'Indoor' },
      { id: 'outdoor', label: 'Outdoor' },
      { id: 'doorbell', label: 'Doorbell' },
      { id: 'lightbulb', label: 'Lightbulb' },
      { id: 'window', label: 'Window' },
    ]},
    { label: 'Power', capabilities: [
      { id: 'wired', label: 'Wired' },
      { id: 'battery-powered', label: 'Battery' },
      { id: 'solar', label: 'Solar' },
      { id: 'poe', label: 'PoE' },
      { id: 'doorbell-wiring', label: 'Existing Doorbell Wiring' },
    ]},
    { label: 'Connectivity', capabilities: [
      { id: 'wifi-2_4', label: '2.4GHz WiFi' },
      { id: 'wifi-5', label: '5GHz WiFi' },
      { id: 'ethernet-poe', label: 'Ethernet/PoE' },
      { id: 'ble', label: 'BLE' },
    ]},
    { label: 'Form Factor', capabilities: [
      { id: 'form-doorbell', label: 'Doorbell' },
      { id: 'form-bullet-dome', label: 'Bullet/Dome' },
      { id: 'form-floodlight', label: 'Floodlight' },
      { id: 'form-spotlight', label: 'Spotlight' },
      { id: 'form-pan-tilt', label: 'Pan/Tilt' },
      { id: 'form-bulb', label: 'Bulb' },
    ]},
    { label: 'Video', capabilities: [
      { id: 'res-1080p', label: '1080p' },
      { id: 'res-2k', label: '2K' },
      { id: 'res-4k', label: '4K' },
      { id: 'hdr', label: 'HDR' },
      { id: 'ir-night-vision', label: 'IR Night Vision' },
      { id: 'color-night-vision', label: 'Color Night Vision' },
    ]},
    { label: 'Audio', capabilities: [
      { id: 'listen-only', label: 'Listen Only' },
      { id: 'two-way-audio', label: 'Two-Way Audio' },
      { id: 'built-in-siren', label: 'Built-in Siren' },
    ]},
    { label: 'Lighting', capabilities: [
      { id: 'light-spotlight', label: 'Spotlight' },
      { id: 'light-redblue-strobe', label: 'Red/Blue Strobe' },
      { id: 'light-floodlight', label: 'Floodlight' },
    ]},
    { label: 'Edge Based Features', capabilities: [
      { id: 'motion-detection', label: 'Motion Detection' },
      { id: 'person-detection', label: 'Person Detection' },
      { id: 'custom-zones', label: 'Custom Motion Zones' },
      { id: 'distance-detection', label: 'Distance Detection' },
    ]},
    { label: 'Cloud Based Features', capabilities: [
      { id: 'package-detection', label: 'Package Detection' },
      { id: 'vehicle-detection', label: 'Vehicle Detection' },
      { id: 'animal-detection', label: 'Animal Detection' },
    ]},
    { label: 'Recording', capabilities: [
      { id: 'local-sd', label: 'Local (SD Card)' },
      { id: 'cloud-recording', label: 'Cloud Recording' },
      { id: 'continuous-recording', label: 'Continuous Recording' },
      { id: 'event-only-recording', label: 'Event-Only Recording' },
    ]},
    { label: 'Extras', capabilities: [
      { id: 'privacy-shutter', label: 'Privacy Shutter' },
      { id: 'doorbell-button', label: 'Doorbell Button' },
      { id: 'wired-chime', label: 'Wired Chime Support' },
      { id: 'optical-zoom', label: 'Optical Zoom' },
    ]},
  ],
  sensor: [
    { label: 'Sensor Type', capabilities: [
      { id: 'door-window', label: 'Door/Window' },
      { id: 'motion-pir', label: 'Motion (PIR)' },
      { id: 'glass-break', label: 'Glass Break' },
      { id: 'smoke-ionization', label: 'Smoke (Ionization)' },
      { id: 'smoke-photoelectric', label: 'Smoke (Photoelectric)' },
      { id: 'co-detector', label: 'CO Detector' },
      { id: 'flood-water', label: 'Flood/Water' },
      { id: 'freeze', label: 'Freeze' },
      { id: 'panic-button', label: 'Panic Button' },
      { id: 'keyfob', label: 'Key Fob' },
    ]},
    { label: 'RF Protocol', capabilities: [
      { id: 'rf-345mhz', label: '345MHz' },
      { id: 'rf-433mhz', label: '433MHz' },
      { id: 'zwave-908mhz', label: 'Z-Wave 908MHz' },
      { id: 'zigbee-2_4ghz', label: 'Zigbee 2.4GHz' },
    ]},
    { label: 'Power', capabilities: [
      { id: 'sensor-battery', label: 'Battery' },
      { id: 'sensor-hardwired', label: 'Hardwired' },
    ]},
    { label: 'Features', capabilities: [
      { id: 'tamper-detection', label: 'Tamper Detection' },
      { id: 'led-indicator', label: 'LED Indicator' },
      { id: 'bypass-capable', label: 'Bypass Capable' },
      { id: 'pet-immune', label: 'Pet Immune' },
      { id: 'long-range', label: 'Long Range' },
    ]},
  ],
  app: [
    { label: 'Platform', capabilities: [
      { id: 'ios', label: 'iOS' },
      { id: 'android', label: 'Android' },
    ]},
    { label: 'Authentication', capabilities: [
      { id: 'auth-email', label: 'Email/Password' },
      { id: 'auth-biometric', label: 'Biometric' },
      { id: 'auth-2fa', label: '2FA' },
    ]},
    { label: 'Core Features', capabilities: [
      { id: 'app-live-view', label: 'Live View' },
      { id: 'app-clip-playback', label: 'Clip Playback' },
      { id: 'app-arm-disarm', label: 'Arm/Disarm' },
      { id: 'app-push-notifications', label: 'Push Notifications' },
      { id: 'app-sms-notifications', label: 'SMS Notifications' },
      { id: 'app-geofencing', label: 'Geofencing' },
      { id: 'app-event-log', label: 'Event Log' },
      { id: 'app-system-test', label: 'System Test Mode' },
    ]},
    { label: 'User Management', capabilities: [
      { id: 'secondary-users', label: 'Secondary Users' },
      { id: 'guest-access', label: 'Guest Access' },
      { id: 'multiple-locations', label: 'Multiple Locations' },
    ]},
    { label: 'Automation', capabilities: [
      { id: 'rules-engine', label: 'Rules Engine' },
      { id: 'smarthome-integrations', label: 'Smart Home Integrations (Alexa/Google/HomeKit)' },
    ]},
  ],
};

export const CATEGORY_LABELS = {
  hub: 'Hub',
  touchpad: 'Touchpad',
  camera: 'Camera',
  sensor: 'Sensor',
  app: 'App',
};

export const CATEGORIES = ['hub', 'touchpad', 'camera', 'sensor', 'app'];

export const CATEGORY_ICONS = {
  hub: '🏠',
  touchpad: '⌨️',
  camera: '📷',
  sensor: '📡',
  app: '📱',
};
