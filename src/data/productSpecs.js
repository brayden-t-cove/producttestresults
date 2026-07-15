// Schema-driven technical specifications for product catalog
// Each category maps to an array of groups: { label, fields[] }
// Field types: 'text' | 'number' | 'boolean' | 'select' | 'textarea'
// boolean uses 3-state: 'yes' | 'no' | '' (unknown/not set)
// select includes an options[] array

export const SPEC_SCHEMA = {
  camera: [
    {
      label: 'Identity & Record',
      fields: [
        { id: 'sku', label: 'SKU / Part Number', type: 'text' },
        { id: 'upc', label: 'UPC / Barcode', type: 'text' },
        { id: 'modelName', label: 'Model Name (Manufacturer)', type: 'text' },
        { id: 'marketedName', label: 'Marketed Name (Luna/Cove/Alder)', type: 'text' },
        {
          id: 'productStatus',
          label: 'Product Status',
          type: 'select',
          options: ['Active', 'EOL', 'Discontinued', 'Pre-release', 'In Testing'],
        },
        { id: 'colorOptions', label: 'Color Options', type: 'text' },
        { id: 'finish', label: 'Finish', type: 'text' },
        { id: 'bodyMaterial', label: 'Body Material', type: 'text' },
        { id: 'lensMaterial', label: 'Lens Material', type: 'text' },
      ],
    },
    {
      label: 'Hardware',
      fields: [
        { id: 'cpuType', label: 'CPU Type & Speed', type: 'text' },
        { id: 'memory', label: 'Memory', type: 'text' },
        { id: 'ledIndicator', label: 'LED Status Indicator', type: 'boolean' },
        { id: 'dimensions', label: 'Dimensions (mm)', type: 'text' },
        { id: 'weight', label: 'Weight (kg)', type: 'text' },
        {
          id: 'lensCount',
          label: 'Number of Lenses',
          type: 'select',
          options: ['1', '2', '3'],
        },
      ],
    },
    {
      label: 'Optics (Per Lens)',
      type: 'lens-array',
      lensFields: [
        { id: 'lensLabel', label: 'Lens Label / Role', type: 'text', placeholder: 'e.g. Wide, Telephoto, Macro' },
        { id: 'imageSensor', label: 'Image Sensor', type: 'text' },
        { id: 'resolutionHorizontal', label: 'Max Resolution — Horizontal (px)', type: 'text', placeholder: 'e.g. 1920' },
        { id: 'resolutionVertical', label: 'Max Resolution — Vertical (px)', type: 'text', placeholder: 'e.g. 1080' },
        { id: 'horizontalFov', label: 'Horizontal FOV (°)', type: 'text' },
        { id: 'verticalFov', label: 'Vertical FOV (°)', type: 'text' },
        { id: 'diagonalFov', label: 'Diagonal FOV (°)', type: 'text' },
        { id: 'aspectRatio', label: 'Aspect Ratio', type: 'text' },
        { id: 'aperture', label: 'Aperture (f/)', type: 'text' },
        { id: 'focalLength', label: 'Focal Length (mm)', type: 'text' },
        { id: 'digitalZoom', label: 'Digital Zoom', type: 'text' },
        { id: 'opticalZoom', label: 'Optical Zoom', type: 'text' },
        { id: 'colorNightVision', label: 'Color Night Vision', type: 'boolean' },
        { id: 'pirNightVision', label: 'PIR Night Vision', type: 'boolean' },
        { id: 'irRange', label: 'IR / Night Vision Range (m)', type: 'text' },
        { id: 'wideDynamicRange', label: 'Wide Dynamic Range (WDR)', type: 'boolean' },
      ],
    },
    {
      label: 'Video (Shared)',
      fields: [
        {
          id: 'videoEncoding',
          label: 'Video Encoding',
          type: 'select',
          options: ['H.264', 'H.265', 'H.265+', 'MJPEG', 'Other'],
        },
        { id: 'framerateDaytime', label: 'Framerate Daytime (fps)', type: 'text' },
        { id: 'framerateNighttime', label: 'Framerate Nighttime (fps)', type: 'text' },
        { id: 'aov', label: 'AOV Support', type: 'boolean' },
        { id: 'aovFps', label: 'AOV Frame Rate (fps)', type: 'text', placeholder: 'e.g. 15' },
        { id: 'videoFormat', label: 'Video Format', type: 'text' },
        { id: 'radarLidar', label: 'Radar / LiDAR Support', type: 'boolean' },
      ],
    },
    {
      label: 'Pan / Tilt',
      fields: [
        { id: 'ptViewRange', label: 'P/T View Range', type: 'text' },
        { id: 'rotationSpeed', label: 'Rotation Speed', type: 'text' },
        { id: 'ptMechanismType', label: 'P/T Mechanism Type', type: 'text' },
        { id: 'motionTracking', label: 'Motion Tracking', type: 'boolean' },
        { id: 'returnToHome', label: 'Return to Home (Pan/Tilt Follower)', type: 'boolean' },
        { id: 'ptWaypoints', label: 'Pan/Tilt Waypoints', type: 'boolean' },
      ],
    },
    {
      label: 'Audio',
      fields: [
        { id: 'speakerSpec', label: 'Speaker Spec', type: 'text' },
        { id: 'speakerSupport', label: 'Speaker Support', type: 'boolean' },
        { id: 'simultaneousTwoWay', label: 'Supports Simultaneous 2-Way Audio', type: 'boolean' },
        { id: 'builtInSiren', label: 'Built-in Siren', type: 'boolean' },
        { id: 'sirenDecibels', label: 'Siren Decibel Level @ 0.1m', type: 'text' },
        { id: 'noiseCancellation', label: 'Noise & Echo Cancellation', type: 'boolean' },
        { id: 'micSensitivity', label: 'Mic Sensitivity', type: 'text' },
      ],
    },
    {
      label: 'Power',
      fields: [
        { id: 'powerCableLength', label: 'Power Cable Length', type: 'text' },
        { id: 'powerAdapterInput', label: 'Power Adapter Input', type: 'text' },
        { id: 'powerAdapterOutput', label: 'Power Adapter Output', type: 'text' },
        {
          id: 'powerPortType',
          label: 'Power Port Type',
          type: 'select',
          options: ['Micro-USB', 'USB-C', 'DC Barrel', 'Proprietary', 'PoE', 'Solar', 'E26/E27 Light Socket', 'N/A'],
        },
        { id: 'batteryCapacity', label: 'Battery Capacity', type: 'text' },
        { id: 'batteryLifeEstimate', label: 'Average Battery Life Estimate', type: 'text' },
        { id: 'chargingTime', label: 'Average Charging Time', type: 'text' },
        {
          id: 'batteryType',
          label: 'Battery Type',
          type: 'select',
          options: ['Lithium-Ion', 'Lithium Polymer', 'AA', 'AAA', 'CR123', 'Built-in (non-removable)', 'N/A'],
        },
      ],
    },
    {
      label: 'Lighting',
      fields: [
        { id: 'lightBrightness', label: 'Brightness', type: 'text' },
        { id: 'colorTemperature', label: 'Color Temperature', type: 'text' },
        { id: 'irLights', label: 'IR Lights', type: 'boolean' },
        {
          id: 'ledType',
          label: 'LED Type',
          type: 'select',
          options: ['Fixed', 'Adjustable CCT', 'RGB', 'N/A'],
        },
        { id: 'rgbSupport', label: 'RGB Support', type: 'boolean' },
      ],
    },
    {
      label: 'Connectivity',
      fields: [
        {
          id: 'wifiGeneration',
          label: 'WiFi Generation',
          type: 'select',
          options: ['Wi-Fi 4 (802.11n)', 'Wi-Fi 5 (802.11ac)', 'Wi-Fi 6 (802.11ax)', 'Wi-Fi 6E', 'N/A'],
        },
        { id: 'wifi24ghz', label: '2.4GHz WiFi Compatible', type: 'boolean' },
        { id: 'wifi5ghz', label: '5GHz WiFi Compatible', type: 'boolean' },
        { id: 'cellular', label: 'Cellular Connectivity', type: 'boolean' },
        {
          id: 'cellularGeneration',
          label: 'Cellular Generation',
          type: 'select',
          options: ['4G LTE', '5G', 'Cat-M1 (LTE-M)', 'Cat-NB1 (NB-IoT)', 'N/A'],
        },
        {
          id: 'simType',
          label: 'SIM Type',
          type: 'select',
          options: ['Physical SIM', 'eSIM', 'Physical + eSIM', 'N/A'],
        },
        { id: 'bluetooth', label: 'Bluetooth / BLE', type: 'boolean' },
        { id: 'qrEnrollment', label: 'QR Enrollment Support', type: 'boolean' },
        { id: 'minAndroid', label: 'Minimum Android Version', type: 'text' },
        { id: 'minIos', label: 'Minimum iOS Version', type: 'text' },
        { id: 'thirdPartyIntegrations', label: '3rd Party Integrations', type: 'text' },
      ],
    },
    {
      label: 'Edge AI / Smart Detection',
      fields: [
        { id: 'edgeAi', label: 'Edge AI Support', type: 'boolean' },
        { id: 'humanDetection', label: 'Human Detection', type: 'boolean' },
        { id: 'vehicleDetection', label: 'Vehicle Detection', type: 'boolean' },
        { id: 'animalDetection', label: 'Animal / Pet Detection', type: 'boolean' },
        { id: 'birdDetection', label: 'Bird Detection', type: 'boolean' },
        { id: 'packageDetection', label: 'Package Detection', type: 'boolean' },
        { id: 'gateFenceDetection', label: 'Gate / Fence Detection', type: 'boolean' },
        { id: 'motionRegions', label: 'Motion Detection Regions', type: 'boolean' },
        { id: 'alarmRegionZones', label: 'Alarm Region Zones', type: 'boolean' },
        { id: 'privacyZones', label: 'Privacy Zones', type: 'boolean' },
        { id: 'soundDetection', label: 'Sound Detection', type: 'boolean' },
        { id: 'babyCryingDetection', label: 'Baby Crying Detection', type: 'boolean' },
        { id: 'smokeCoDetection', label: 'Smoke / CO Alarm Detection', type: 'boolean' },
        { id: 'sirenAlarmDetection', label: 'General Siren Alarm Detection', type: 'boolean' },
      ],
    },
    {
      label: 'Cloud AI',
      fields: [
        { id: 'cloudAi', label: 'Cloud AI Support', type: 'boolean' },
      ],
    },
    {
      label: 'Camera Features',
      fields: [
        { id: 'doorbellPress', label: 'Doorbell Press', type: 'boolean' },
        { id: 'voip', label: 'VoIP', type: 'boolean' },
        { id: 'privacyMode', label: 'Privacy Mode', type: 'boolean' },
        { id: 'activityScheduling', label: 'Activity Scheduling', type: 'boolean' },
        { id: 'flipImage', label: 'Flip Image', type: 'boolean' },
        { id: 'rotateImage', label: 'Rotate Image 90°', type: 'boolean' },
        { id: 'resolutionAdjustment', label: 'Resolution Adjustment', type: 'boolean' },
        { id: 'manualRecording', label: 'Manual Recordings', type: 'boolean' },
        { id: 'manualScreenshot', label: 'Manual Screenshots', type: 'boolean' },
        { id: 'networkReconfiguration', label: 'Network Reconfiguration', type: 'boolean' },
        { id: 'powerConservation', label: 'Power Conservation Mode', type: 'boolean' },
        { id: 'localStorageReformat', label: 'Local Storage Reformatting', type: 'boolean' },
        { id: 'speakerVolumeAdjust', label: 'Speaker Volume Adjustment', type: 'boolean' },
        { id: 'voicePitchChange', label: 'Voice Pitch Change (2-Way Audio)', type: 'boolean' },
        { id: 'lightBrightnessControl', label: 'Light Brightness Control', type: 'boolean' },
        { id: 'lightTempControl', label: 'Light Color Temperature Control', type: 'boolean' },
        { id: 'lightRgbControl', label: 'Light RGB Color Control', type: 'boolean' },
        { id: 'otaUpdate', label: 'OTA Firmware Update', type: 'boolean' },
        { id: 'ledToggle', label: 'Camera LED Status Light Toggle', type: 'boolean' },
      ],
    },
    {
      label: 'Mounting',
      fields: [
        { id: 'standMount', label: 'Stand Mount', type: 'boolean' },
        { id: 'wallMount', label: 'Wall Mount', type: 'boolean' },
        { id: 'ceilingMount', label: 'Ceiling Mount', type: 'boolean' },
        { id: 'magneticMount', label: 'Magnetic Mounting', type: 'boolean' },
        { id: 'lightSocketMount', label: 'Light Socket Mount', type: 'boolean' },
        { id: 'adhesiveMount', label: 'Adhesive Mount', type: 'boolean' },
        { id: 'mountScrewSize', label: 'Mount Screw Size', type: 'text' },
      ],
    },
    {
      label: 'Storage',
      fields: [
        { id: 'localStorage', label: 'Supports Local Storage', type: 'boolean' },
        { id: 'cloudStorage', label: 'Supports Cloud Storage', type: 'boolean' },
        { id: 'localStorageSizeLimit', label: 'Local Storage Size Limit', type: 'text' },
      ],
    },
    {
      label: 'Interface (I/O)',
      fields: [
        { id: 'resetButton', label: 'Reset Button or Sequence', type: 'text' },
        { id: 'powerButton', label: 'Power Button', type: 'boolean' },
        { id: 'syncButton', label: 'Sync / Setup Button', type: 'boolean' },
      ],
    },
    {
      label: 'Environmental',
      fields: [
        { id: 'operatingTemp', label: 'Operating Temperature', type: 'text' },
        { id: 'storageTemp', label: 'Storage Temperature', type: 'text' },
        {
          id: 'ipRating',
          label: 'IP Rating',
          type: 'select',
          options: ['Not Rated', 'IP44', 'IP54', 'IP55', 'IP65', 'IP66', 'IP67', 'IP68'],
        },
        { id: 'humidityRating', label: 'Humidity Rating', type: 'text' },
      ],
    },
    {
      label: 'Package & Accessories',
      fields: [
        { id: 'languages', label: 'Supported Languages', type: 'textarea' },
        { id: 'packageContents', label: 'Package Contents (itemized)', type: 'textarea' },
        { id: 'accessories', label: 'Accessory Support', type: 'textarea' },
        { id: 'auxNotes', label: 'Auxiliary Notes', type: 'textarea' },
      ],
    },
  ],

  // TODO: expand with category-specific fields
  hub: [
    {
      label: 'Identity & Record',
      fields: [
        { id: 'sku', label: 'SKU / Part Number', type: 'text' },
        { id: 'upc', label: 'UPC / Barcode', type: 'text' },
        {
          id: 'productStatus',
          label: 'Product Status',
          type: 'select',
          options: ['Active', 'EOL', 'Discontinued', 'Pre-release', 'In Testing'],
        },
        { id: 'auxNotes', label: 'Auxiliary Notes', type: 'textarea' },
      ],
    },
  ],

  // TODO: expand with category-specific fields
  touchpad: [
    {
      label: 'Identity & Record',
      fields: [
        { id: 'sku', label: 'SKU / Part Number', type: 'text' },
        { id: 'upc', label: 'UPC / Barcode', type: 'text' },
        {
          id: 'productStatus',
          label: 'Product Status',
          type: 'select',
          options: ['Active', 'EOL', 'Discontinued', 'Pre-release', 'In Testing'],
        },
        { id: 'auxNotes', label: 'Auxiliary Notes', type: 'textarea' },
      ],
    },
  ],

  // TODO: expand with category-specific fields
  sensor: [
    {
      label: 'Identity & Record',
      fields: [
        { id: 'sku', label: 'SKU / Part Number', type: 'text' },
        { id: 'upc', label: 'UPC / Barcode', type: 'text' },
        {
          id: 'productStatus',
          label: 'Product Status',
          type: 'select',
          options: ['Active', 'EOL', 'Discontinued', 'Pre-release', 'In Testing'],
        },
        { id: 'auxNotes', label: 'Auxiliary Notes', type: 'textarea' },
      ],
    },
  ],

  // TODO: expand with category-specific fields
  app: [
    {
      label: 'Identity & Record',
      fields: [
        { id: 'sku', label: 'SKU / Part Number', type: 'text' },
        { id: 'upc', label: 'UPC / Barcode', type: 'text' },
        {
          id: 'productStatus',
          label: 'Product Status',
          type: 'select',
          options: ['Active', 'EOL', 'Discontinued', 'Pre-release', 'In Testing'],
        },
        { id: 'auxNotes', label: 'Auxiliary Notes', type: 'textarea' },
      ],
    },
  ],
};
