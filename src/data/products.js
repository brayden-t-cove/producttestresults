export const PRODUCTS = [
  // Hubs
  { id: 'hub-gen1', name: 'Hub (Gen 1)', category: 'hub', subcategory: null },
  { id: 'hub-gen2', name: 'Hub (Gen 2)', category: 'hub', subcategory: null },
  { id: 'hub-gen3pro', name: 'Hub (Gen 3 Pro)', category: 'hub', subcategory: null },

  // Cameras
  { id: 'cam-indoor', name: 'Indoor Camera', category: 'camera', subcategory: 'indoor' },
  { id: 'cam-outdoor', name: 'Outdoor Camera', category: 'camera', subcategory: 'outdoor' },
  { id: 'cam-doorbell-wired', name: 'Doorbell Camera (Wired)', category: 'camera', subcategory: 'doorbell' },
  { id: 'cam-doorbell-battery', name: 'Doorbell Camera (Battery)', category: 'camera', subcategory: 'doorbell' },
  { id: 'cam-floodlight', name: 'Floodlight Camera', category: 'camera', subcategory: 'outdoor' },

  // Sensors
  { id: 'sensor-door', name: 'Door/Window Sensor', category: 'sensor', subcategory: 'door' },
  { id: 'sensor-motion', name: 'Motion Sensor (PIR)', category: 'sensor', subcategory: 'motion' },
  { id: 'sensor-glassbreak', name: 'Glass Break Sensor', category: 'sensor', subcategory: 'glass-break' },
  { id: 'sensor-smoke', name: 'Smoke Detector', category: 'sensor', subcategory: 'smoke' },
  { id: 'sensor-co', name: 'CO Detector', category: 'sensor', subcategory: 'co' },
  { id: 'sensor-panic', name: 'Panic Button', category: 'sensor', subcategory: 'motion' },

  // Apps
  { id: 'app-ios', name: 'iOS App', category: 'app', subcategory: 'ios' },
  { id: 'app-android', name: 'Android App', category: 'app', subcategory: 'android' },
];

export const CATEGORY_LABELS = {
  hub: 'Hubs',
  camera: 'Cameras',
  sensor: 'Sensors',
  app: 'Apps',
};
