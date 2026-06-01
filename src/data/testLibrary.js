export const BASELINE_TESTS = {
  hub: [
    {
      id: 'hub-baseline-power-cycle',
      title: 'Power cycle reconnection',
      description: 'Unplug the hub from AC power. Wait 30 seconds. Plug the hub back in and observe reconnection behavior.',
      expected: 'Hub reconnects to the network and appears online in the app within 2 minutes of being plugged back in.',
    },
    {
      id: 'hub-baseline-factory-reset',
      title: 'Factory reset clears all devices',
      description: 'Perform a factory reset on the hub using the reset button or app interface. Allow the reset to complete fully.',
      expected: 'All paired devices are removed, the hub returns to setup mode, and the app shows the hub as unconfigured.',
    },
    {
      id: 'hub-baseline-app-connectivity',
      title: 'Hub appears online in app on boot',
      description: 'Power on the hub from a cold start. Open the app and monitor the hub status indicator.',
      expected: 'Hub status changes to online in the app within 60 seconds of powering on.',
    },
  ],
  touchpad: [
    {
      id: 'tp-baseline-power-on',
      title: 'Touchpad powers on and displays correctly',
      description: 'Apply power to the touchpad. Observe the display and indicator LEDs during boot.',
      expected: 'Touchpad powers on, the display illuminates correctly, and the device reaches a ready state without errors.',
    },
    {
      id: 'tp-baseline-hub-pairing',
      title: 'Pair touchpad to hub',
      description: 'Initiate touchpad pairing from the hub or app interface. Follow the pairing sequence on the touchpad.',
      expected: 'Touchpad pairs successfully to the hub and appears as a connected device in the app.',
    },
    {
      id: 'tp-baseline-arm',
      title: 'Arm system via touchpad',
      description: 'With the system disarmed, enter a valid security code on the touchpad and select the arm mode.',
      expected: 'System arms successfully; app and hub reflect the armed state within 3 seconds.',
    },
    {
      id: 'tp-baseline-disarm',
      title: 'Disarm system via touchpad',
      description: 'With the system armed, enter a valid security code on the touchpad.',
      expected: 'System disarms successfully; app and hub reflect the disarmed state within 3 seconds.',
    },
    {
      id: 'tp-baseline-invalid-code',
      title: 'Invalid code lockout or alert',
      description: 'Enter an incorrect security code on the touchpad 3 times in succession.',
      expected: 'After 3 invalid attempts, the touchpad triggers a lockout or sends an alert to the hub/app.',
    },
  ],
  camera: [
    {
      id: 'cam-baseline-app-pairing',
      title: 'Camera pairs via app setup',
      description: 'Begin camera setup flow in the app. Follow all prompts to complete the pairing process.',
      expected: 'Camera setup completes successfully and the camera appears in the device list with correct name.',
    },
    {
      id: 'cam-baseline-live-stream-load',
      title: 'Live stream loads within 5 seconds',
      description: 'Open the camera live view from the app. Measure time from tap to first frame displayed.',
      expected: 'Live stream begins playing within 5 seconds of opening the live view.',
    },
    {
      id: 'cam-baseline-live-stream-stable',
      title: 'Live stream stable for 60 seconds',
      description: 'Open camera live view and leave it playing for 60 seconds. Monitor for freezing or buffering.',
      expected: 'Stream plays continuously for 60 seconds without freezing, buffering, or dropping.',
    },
  ],
  sensor: [
    {
      id: 'sensor-baseline-hub-pairing',
      title: 'Sensor pairs to hub with correct zone',
      description: 'Initiate sensor pairing from the hub or app. Assign a zone name during setup. Complete the pairing process.',
      expected: 'Sensor appears in the app and hub with the correct zone name and sensor type.',
    },
    {
      id: 'sensor-baseline-trigger',
      title: 'Primary trigger registers in app and hub',
      description: 'Trigger the sensor (open a door/window, walk through PIR zone, etc.) and observe app and hub response.',
      expected: 'Hub and app show the triggered state within 3 seconds of the sensor being triggered.',
    },
    {
      id: 'sensor-baseline-return-normal',
      title: 'Sensor returns to normal state',
      description: 'After triggering the sensor, clear the trigger condition (close door, leave PIR zone, etc.).',
      expected: 'Hub and app show the sensor returning to normal state within 5 seconds of clearing the trigger.',
    },
  ],
  app: [
    {
      id: 'app-baseline-sign-in',
      title: 'Sign in with valid credentials',
      description: 'Launch the app and enter valid account credentials on the login screen.',
      expected: 'Login succeeds and the dashboard loads showing all devices and system status.',
    },
    {
      id: 'app-baseline-sign-out',
      title: 'Sign out clears session',
      description: 'Sign out of the app using the account/settings menu.',
      expected: 'Session is cleared, user is returned to the login screen, and no account data is visible.',
    },
    {
      id: 'app-baseline-dashboard-load',
      title: 'Dashboard displays all devices and status',
      description: 'After login, observe the dashboard for correct rendering of devices, system status, and navigation.',
      expected: 'All devices display with correct status indicators; system arm/disarm state is accurate.',
    },
  ],
};

export const TEST_LIBRARY = {
  // ─── HUB ───────────────────────────────────────────────────────────────────
  'z-wave': [
    {
      id: 'hub-zwave-pair',
      title: 'Z-Wave device pairing',
      description: 'Put the hub into Z-Wave inclusion mode. Include a Z-Wave lock or sensor. Verify the device appears in the hub and app.',
      expected: 'Z-Wave device pairs successfully and appears in the device list with correct type and zone.',
    },
    {
      id: 'hub-zwave-trigger',
      title: 'Z-Wave device trigger response',
      description: 'With a Z-Wave sensor or lock paired, trigger the device and observe hub and app response.',
      expected: 'Hub receives the Z-Wave event and the app reflects the state change within 3 seconds.',
    },
    {
      id: 'hub-zwave-unpair',
      title: 'Z-Wave device remove and unpair',
      description: 'Put the hub into Z-Wave exclusion mode. Exclude the Z-Wave device. Verify removal.',
      expected: 'Device is removed from the hub and no longer appears in the app device list.',
    },
  ],
  'rf-sensors': [
    {
      id: 'hub-rf-pair',
      title: 'RF sensor pairing to hub',
      description: 'Use the hub or app pairing flow to add an RF sensor. Trip the sensor during enrollment.',
      expected: 'RF sensor pairs and appears in the hub and app with correct zone assignment.',
    },
    {
      id: 'hub-rf-alarm',
      title: 'RF sensor trigger activates alarm',
      description: 'With the system armed, trip the paired RF sensor.',
      expected: 'Hub receives the RF signal and triggers the alarm within 3 seconds.',
    },
    {
      id: 'hub-rf-supervision',
      title: 'RF sensor supervision signal received',
      description: 'Wait for the supervision interval (check product spec). Verify the hub receives the supervisory check-in.',
      expected: 'Hub logs a supervision check-in from the RF sensor; app shows sensor as active.',
    },
  ],
  'wifi-devices': [
    {
      id: 'hub-wifi-device-pair',
      title: 'WiFi device pairing to hub',
      description: 'Add a WiFi-connected device through the hub or app setup flow.',
      expected: 'WiFi device pairs successfully and appears online in the hub and app.',
    },
    {
      id: 'hub-wifi-device-reboot',
      title: 'WiFi device reconnects after hub reboot',
      description: 'Reboot the hub. After hub comes online, verify connected WiFi devices reconnect.',
      expected: 'All paired WiFi devices reconnect to the hub within 3 minutes after hub reboot.',
    },
  ],
  'bluetooth': [
    {
      id: 'hub-bt-discovery',
      title: 'Bluetooth device discovery',
      description: 'Put a Bluetooth accessory in pairing mode. Open the hub/app Bluetooth discovery scan.',
      expected: 'The Bluetooth device appears in the discovered devices list.',
    },
    {
      id: 'hub-bt-pair',
      title: 'Bluetooth device pairing',
      description: 'Select the discovered Bluetooth device and complete the pairing sequence.',
      expected: 'Bluetooth device pairs successfully and appears in the hub/app device list.',
    },
  ],
  'battery-backup': [
    {
      id: 'hub-battery-ac-disconnect',
      title: 'Hub operates on battery backup when AC removed',
      description: 'Disconnect AC power from the hub. Observe hub status and app connectivity.',
      expected: 'Hub continues operating on battery backup without dropping connectivity or losing sensor communication.',
    },
    {
      id: 'hub-battery-level-reported',
      title: 'Battery backup level reported in app',
      description: 'With the hub on battery backup, check the hub details in the app for battery status.',
      expected: 'App displays a battery level or battery backup indicator that reflects current charge.',
    },
    {
      id: 'hub-battery-ac-restore',
      title: 'Hub transitions back to AC power',
      description: 'Reconnect AC power to the hub while it is running on battery.',
      expected: 'Hub transitions from battery to AC power without rebooting or losing connectivity.',
    },
  ],
  'cellular-backup': [
    {
      id: 'hub-cellular-switch',
      title: 'Hub switches to cellular when ethernet removed',
      description: 'Disconnect the ethernet cable from the hub. Observe connection status in the app.',
      expected: 'Hub switches to cellular backup within 60 seconds and maintains connectivity.',
    },
    {
      id: 'hub-cellular-alarm-signal',
      title: 'Alarm signals transmit over cellular',
      description: 'With ethernet disconnected (cellular active), trigger an alarm.',
      expected: 'Alarm signal transmits to the monitoring center or app via cellular.',
    },
    {
      id: 'hub-cellular-ethernet-restore',
      title: 'Hub returns to ethernet when reconnected',
      description: 'Reconnect the ethernet cable to the hub while it is on cellular.',
      expected: 'Hub transitions back to ethernet connectivity within 60 seconds of reconnection.',
    },
  ],
  'ethernet': [
    {
      id: 'hub-eth-stable',
      title: 'Ethernet connection stable after reboot',
      description: 'Reboot the hub. Observe ethernet connectivity after it comes back online.',
      expected: 'Hub establishes ethernet connection after reboot and remains connected.',
    },
    {
      id: 'hub-eth-link-speed',
      title: 'Ethernet link speed reported correctly',
      description: 'Check hub details in the app or admin interface for ethernet connection information.',
      expected: 'Ethernet link speed is reported (e.g., 100Mbps or 1Gbps) and is correct for the connected network.',
    },
  ],
  'wifi': [
    {
      id: 'hub-wifi-stable',
      title: 'Hub WiFi connection stable after reboot',
      description: 'Reboot the hub. Monitor WiFi connection status after it comes back online.',
      expected: 'Hub reconnects to WiFi after reboot and maintains a stable connection.',
    },
    {
      id: 'hub-wifi-router-restart',
      title: 'Hub WiFi reconnects after router restart',
      description: 'Restart the WiFi router. Monitor hub connectivity in the app.',
      expected: 'Hub reconnects to WiFi within 3 minutes after the router becomes available.',
    },
    {
      id: 'hub-wifi-signal-strength',
      title: 'WiFi signal strength visible in app',
      description: 'Navigate to hub details or diagnostics in the app.',
      expected: 'WiFi signal strength or RSSI is displayed and reflects the actual network environment.',
    },
  ],
  'onboard-siren': [
    {
      id: 'hub-siren-triggers',
      title: 'Siren sounds on alarm trigger',
      description: 'Arm the system and trigger an alarm condition (trip a sensor without disarming).',
      expected: 'Hub onboard siren sounds loudly within 3 seconds of the alarm being triggered.',
    },
    {
      id: 'hub-siren-cancels',
      title: 'Siren stops on alarm cancel',
      description: 'With alarm and siren active, cancel the alarm from the app or keypad.',
      expected: 'Siren stops sounding within 2 seconds of alarm cancellation.',
    },
    {
      id: 'hub-siren-volume',
      title: 'Siren volume level verified',
      description: 'Trigger the siren and measure volume from 10 feet.',
      expected: 'Siren volume is loud enough to be clearly audible at 10 feet (expected ≥ 85dB at 10ft per spec).',
    },
  ],
  'touchpad': [
    {
      id: 'hub-tp-pair',
      title: 'Touchpad pairs to hub',
      description: 'Initiate touchpad pairing from hub or app. Complete the pairing sequence.',
      expected: 'Touchpad pairs to hub and appears as a connected device in the app.',
    },
    {
      id: 'hub-tp-arm-disarm-state',
      title: 'Arm/disarm via touchpad updates hub state',
      description: 'Use the touchpad to arm and then disarm the system. Observe hub and app status.',
      expected: 'Hub state changes are reflected in the app within 3 seconds of touchpad entry.',
    },
    {
      id: 'hub-tp-invalid-code',
      title: 'Invalid code handling on touchpad',
      description: 'Enter an incorrect code 3 times on the touchpad.',
      expected: 'System triggers a lockout or sends an alert after repeated invalid entries.',
    },
  ],
  'keypad': [
    {
      id: 'hub-keypad-pair',
      title: 'Keypad pairs to hub',
      description: 'Pair a keypad to the hub using the setup flow.',
      expected: 'Keypad appears as a paired device in the hub and app.',
    },
    {
      id: 'hub-keypad-arm-disarm',
      title: 'Arm and disarm via keypad',
      description: 'Use the keypad to arm the system, then enter a valid code to disarm.',
      expected: 'Hub arm and disarm states change correctly and are reflected in the app.',
    },
    {
      id: 'hub-keypad-tamper',
      title: 'Keypad tamper detection',
      description: 'Open or remove the keypad from its mount to trigger the tamper switch.',
      expected: 'Hub and app receive a tamper alert for the keypad within 5 seconds.',
    },
  ],
  'key-fob': [
    {
      id: 'hub-keyfob-pair',
      title: 'Key fob pairs to hub',
      description: 'Use the app or hub to add a key fob. Follow the pairing button sequence on the fob.',
      expected: 'Key fob appears as a paired device in the hub and app.',
    },
    {
      id: 'hub-keyfob-arm',
      title: 'Key fob arm button arms system',
      description: 'Press the arm button on the key fob.',
      expected: 'System arms and the app reflects the armed state within 3 seconds.',
    },
    {
      id: 'hub-keyfob-disarm',
      title: 'Key fob disarm button disarms system',
      description: 'With the system armed, press the disarm button on the key fob.',
      expected: 'System disarms and the app reflects the disarmed state within 3 seconds.',
    },
    {
      id: 'hub-keyfob-panic',
      title: 'Key fob panic button triggers alarm',
      description: 'Press the panic button on the key fob.',
      expected: 'Hub triggers a panic alarm; app and monitoring center (if applicable) receive the alert.',
    },
  ],
  'rf-sensor-peripheral': [
    {
      id: 'hub-rfp-pair',
      title: 'RF peripheral sensor pairing',
      description: 'Pair an RF sensor peripheral to the hub using the app setup flow.',
      expected: 'RF sensor appears in the hub and app with correct zone name and type.',
    },
    {
      id: 'hub-rfp-alarm',
      title: 'RF peripheral sensor triggers alarm',
      description: 'With system armed, trigger the RF sensor peripheral.',
      expected: 'Hub receives the RF signal and triggers alarm within 3 seconds.',
    },
    {
      id: 'hub-rfp-supervision',
      title: 'RF peripheral supervision signal',
      description: 'Wait for the supervision interval. Verify hub receives the check-in.',
      expected: 'Hub logs the supervision signal and sensor remains marked active.',
    },
  ],
  'zwave-devices': [
    {
      id: 'hub-zwdev-pair',
      title: 'Z-Wave device pairing',
      description: 'Put hub in Z-Wave inclusion mode. Include a Z-Wave device and verify enrollment.',
      expected: 'Z-Wave device pairs and appears in hub and app device list.',
    },
    {
      id: 'hub-zwdev-trigger',
      title: 'Z-Wave device event received by hub',
      description: 'Trigger the Z-Wave device and verify hub receives the event.',
      expected: 'Hub processes the Z-Wave event and app reflects the correct state within 3 seconds.',
    },
    {
      id: 'hub-zwdev-unpair',
      title: 'Z-Wave device exclusion',
      description: 'Put hub in exclusion mode and exclude the Z-Wave device.',
      expected: 'Device is removed from hub and app device list.',
    },
  ],
  'alexa': [
    {
      id: 'hub-alexa-link',
      title: 'Link Alexa skill to hub account',
      description: 'Open the Alexa app or skill section. Link the hub account skill using account credentials.',
      expected: 'Alexa skill links successfully and hub devices are discoverable by Alexa.',
    },
    {
      id: 'hub-alexa-arm',
      title: 'Arm system via Alexa voice command',
      description: 'Issue the voice command to arm the system (e.g., "Alexa, arm [system name] away").',
      expected: 'System arms via Alexa and app reflects armed state.',
    },
    {
      id: 'hub-alexa-disarm',
      title: 'Disarm system via Alexa',
      description: 'Issue the voice command to disarm (with PIN if required).',
      expected: 'System disarms via Alexa and app reflects disarmed state.',
    },
    {
      id: 'hub-alexa-status',
      title: 'Alexa reports system status',
      description: 'Ask Alexa for the current status of the security system.',
      expected: 'Alexa accurately reports whether the system is armed, disarmed, or in alarm.',
    },
  ],
  'google-home': [
    {
      id: 'hub-google-link',
      title: 'Link Google Home action',
      description: 'Open Google Home app. Add the hub as a linked service.',
      expected: 'Google Home action links successfully and hub devices are visible in Google Home.',
    },
    {
      id: 'hub-google-arm',
      title: 'Arm system via Google Assistant',
      description: 'Issue a Google Assistant command to arm the security system.',
      expected: 'System arms via Google Assistant and app reflects armed state.',
    },
    {
      id: 'hub-google-disarm',
      title: 'Disarm system via Google Assistant',
      description: 'Issue a Google Assistant command to disarm the system.',
      expected: 'System disarms via Google Assistant and app reflects disarmed state.',
    },
  ],
  'professional-monitoring': [
    {
      id: 'hub-promon-signal',
      title: 'Monitoring center receives alarm signal',
      description: 'Trigger an alarm on the hub. Wait for monitoring center contact.',
      expected: 'Monitoring center receives the alarm signal within 60 seconds of trigger.',
    },
    {
      id: 'hub-promon-dispatch',
      title: 'Monitoring center places dispatch call',
      description: 'Allow the alarm to continue without cancellation. Monitor for dispatch call.',
      expected: 'Monitoring center places a dispatch call to the account holder within the SLA window.',
    },
    {
      id: 'hub-promon-cancel',
      title: 'Alarm cancel with cancel code',
      description: 'When contacted by monitoring center, provide the cancel code to abort dispatch.',
      expected: 'Monitoring center accepts the cancel code and dispatch is aborted.',
    },
  ],
  'self-monitoring': [
    {
      id: 'hub-selfmon-push',
      title: 'Push notification on alarm trigger',
      description: 'Trigger an alarm with self-monitoring active. Monitor the app for push notification.',
      expected: 'Push notification is received on the mobile device within 30 seconds of alarm trigger.',
    },
    {
      id: 'hub-selfmon-sms',
      title: 'SMS notification on alarm trigger',
      description: 'Trigger an alarm with SMS notifications enabled. Monitor for SMS delivery.',
      expected: 'SMS notification is received on the registered phone number within 60 seconds of alarm trigger.',
    },
  ],

  // ─── TOUCHPAD ──────────────────────────────────────────────────────────────
  'esp32': [
    {
      id: 'tp-esp32-ota',
      title: 'ESP-32 firmware update OTA',
      description: 'Initiate an over-the-air firmware update for the ESP-32 module via the app.',
      expected: 'OTA update completes successfully and touchpad reboots with the new firmware version.',
    },
    {
      id: 'tp-esp32-stable',
      title: 'ESP-32 connectivity stable after reboot',
      description: 'Reboot the touchpad and verify ESP-32 connectivity after boot.',
      expected: 'ESP-32 module reconnects and touchpad is fully operational after reboot.',
    },
  ],

  // ─── CAMERA ────────────────────────────────────────────────────────────────
  'indoor': [],
  'outdoor': [
    {
      id: 'cam-outdoor-weatherproof',
      title: 'Weatherproofing — simulate moisture exposure',
      description: 'Expose the outdoor camera to simulated rain or moisture (splash test). Observe image and connectivity during/after.',
      expected: 'Camera continues operating without image degradation or connectivity loss during moisture exposure.',
    },
    {
      id: 'cam-outdoor-mount',
      title: 'Outdoor mount stability',
      description: 'Install camera on outdoor mount. Apply moderate force/vibration and observe for movement.',
      expected: 'Mount holds camera securely with no significant shift or rotation under force.',
    },
  ],
  'doorbell': [
    {
      id: 'cam-doorbell-press-notify',
      title: 'Doorbell button press sends app notification',
      description: 'Press the doorbell button. Monitor the app for an incoming call or notification.',
      expected: 'App receives a notification or incoming call prompt within 5 seconds of button press.',
    },
    {
      id: 'cam-doorbell-visitor-detect',
      title: 'Visitor detection on button press',
      description: 'Press the doorbell button and check event history in the app.',
      expected: 'A visitor event is logged with a thumbnail image in the event history.',
    },
    {
      id: 'cam-doorbell-chime',
      title: 'Doorbell press triggers chime',
      description: 'Press the doorbell button while a chime device is connected.',
      expected: 'Chime sounds within 2 seconds of doorbell button press.',
    },
  ],
  'lightbulb': [
    {
      id: 'cam-bulb-install',
      title: 'Bulb socket installation',
      description: 'Install camera in a standard light bulb socket. Verify secure fit and power delivery.',
      expected: 'Camera installs securely and powers on from the bulb socket.',
    },
    {
      id: 'cam-bulb-operates',
      title: 'Camera operates while bulb is lit',
      description: 'Enable the light bulb function and verify camera streaming while bulb is on.',
      expected: 'Camera streams normally without interference while the bulb is illuminated.',
    },
  ],
  'window': [
    {
      id: 'cam-window-mount',
      title: 'Window mount adhesion',
      description: 'Mount camera to a clean glass window using the adhesive/suction mount. Apply gentle force after 30 minutes.',
      expected: 'Camera remains securely attached to the window without slipping.',
    },
    {
      id: 'cam-window-glare',
      title: 'No glare or reflection interference with detection',
      description: 'Install window camera and enable motion/person detection. Trigger events with window glare present.',
      expected: 'Detection events are accurate and not falsely triggered by window glare or reflection.',
    },
  ],
  'battery-powered': [
    {
      id: 'cam-battery-level',
      title: 'Battery level displayed in app',
      description: 'Check camera settings or device details in the app.',
      expected: 'Battery level percentage is visible and accurate.',
    },
    {
      id: 'cam-battery-low-notify',
      title: 'Low battery notification at threshold',
      description: 'Allow battery to drain to the low battery threshold (or simulate). Check for app notification.',
      expected: 'App sends a low battery notification when battery drops to the configured threshold (e.g., 20%).',
    },
    {
      id: 'cam-battery-life',
      title: 'Battery life estimate under normal use',
      description: 'Monitor battery consumption over 24 hours with normal detection activity.',
      expected: 'Battery drains at a rate consistent with product spec (e.g., several months per charge).',
    },
  ],
  'solar': [
    {
      id: 'cam-solar-charging',
      title: 'Solar charging active in daylight',
      description: 'Place camera in direct sunlight. Check charging status in app.',
      expected: 'App shows solar charging active and battery level is stable or increasing.',
    },
    {
      id: 'cam-solar-threshold',
      title: 'Battery maintained above threshold after 24h sunlight',
      description: 'Monitor camera battery level after 24 hours of normal daylight exposure.',
      expected: 'Battery remains above minimum operating threshold after 24 hours of sunlight.',
    },
    {
      id: 'cam-solar-dark',
      title: 'No solar charging reported in darkness',
      description: 'Cover solar panel or operate at night. Check charging status.',
      expected: 'App shows solar charging as inactive when panel is not receiving sunlight.',
    },
  ],
  'poe': [
    {
      id: 'cam-poe-negotiate',
      title: 'PoE power negotiation',
      description: 'Connect camera to a PoE switch port. Observe power LED and connectivity.',
      expected: 'Camera negotiates PoE power successfully and boots without requiring external power.',
    },
    {
      id: 'cam-poe-stable',
      title: 'PoE connection stable under load',
      description: 'Stream live video continuously for 10 minutes via PoE connection.',
      expected: 'Connection remains stable with no power interruptions or stream drops.',
    },
  ],
  'doorbell-wiring': [
    {
      id: 'cam-dbwire-stable',
      title: 'Wired doorbell power delivery stable',
      description: 'Connect camera to existing doorbell wiring. Monitor power and connectivity over 30 minutes.',
      expected: 'Camera maintains stable power and connectivity via doorbell wiring.',
    },
    {
      id: 'cam-dbwire-no-flicker',
      title: 'No flicker during event recording',
      description: 'Trigger a recording event while powered by doorbell wiring. Review the recorded clip.',
      expected: 'Recorded clip shows no video flicker or power interruption.',
    },
  ],
  'wifi-2_4': [
    {
      id: 'cam-24g-stable',
      title: '2.4GHz connection stable',
      description: 'Connect camera to 2.4GHz network and stream live view for 5 minutes.',
      expected: 'Stream is stable with no drops on 2.4GHz band.',
    },
    {
      id: 'cam-24g-range',
      title: '2.4GHz range test at 30ft',
      description: 'Position camera 30 feet from the router. Test live stream quality.',
      expected: 'Camera maintains connection and streams without significant quality degradation at 30ft.',
    },
    {
      id: 'cam-24g-reconnect',
      title: '2.4GHz reconnects after router restart',
      description: 'Restart the 2.4GHz router. Monitor camera for reconnection.',
      expected: 'Camera reconnects to 2.4GHz network within 3 minutes after router is back online.',
    },
  ],
  'wifi-5': [
    {
      id: 'cam-5g-stable',
      title: '5GHz connection stable',
      description: 'Connect camera to 5GHz network and stream live view for 5 minutes.',
      expected: 'Stream is stable with sufficient throughput for HD video on 5GHz.',
    },
    {
      id: 'cam-5g-throughput',
      title: '5GHz throughput sufficient for HD stream',
      description: 'Monitor stream bitrate and quality on 5GHz connection.',
      expected: 'Throughput is adequate for HD or higher resolution streaming without buffering.',
    },
    {
      id: 'cam-5g-reconnect',
      title: '5GHz reconnects after router restart',
      description: 'Restart the 5GHz router. Monitor camera for reconnection.',
      expected: 'Camera reconnects to 5GHz network within 3 minutes after router is back online.',
    },
  ],
  'ethernet-poe': [
    {
      id: 'cam-eth-stable',
      title: 'Ethernet connection stable',
      description: 'Connect camera via Ethernet. Stream live view for 10 minutes.',
      expected: 'Ethernet connection is stable with no drops.',
    },
    {
      id: 'cam-eth-4k-throughput',
      title: 'Ethernet throughput sufficient for 4K stream',
      description: 'Stream at 4K resolution over Ethernet and verify quality.',
      expected: 'Ethernet provides sufficient bandwidth for 4K stream without buffering.',
    },
  ],
  'ble': [
    {
      id: 'cam-ble-pair-setup',
      title: 'BLE pairing during initial setup',
      description: 'Begin camera setup using the app BLE flow. Follow prompts to connect via BLE.',
      expected: 'Camera pairs via BLE during setup without requiring manual network entry.',
    },
    {
      id: 'cam-ble-range',
      title: 'BLE range during initial configuration',
      description: 'Move phone to different positions during BLE setup. Verify signal at various distances.',
      expected: 'BLE connection is stable for setup at reasonable distances (5-10ft minimum).',
    },
  ],
  'ir-night-vision': [
    {
      id: 'cam-ir-activates',
      title: 'IR activates in low light (< 5 lux)',
      description: 'Reduce ambient light below 5 lux and observe camera mode switch.',
      expected: 'IR night vision mode activates automatically and IR LEDs illuminate.',
    },
    {
      id: 'cam-ir-10ft',
      title: 'IR range: clear image at 10ft',
      description: 'Place a subject at 10 feet from camera in complete darkness. Review the live stream.',
      expected: 'Subject is clearly identifiable in the IR night vision image at 10ft.',
    },
    {
      id: 'cam-ir-30ft',
      title: 'IR range: identifiable image at 30ft',
      description: 'Place a subject at 30 feet from camera in darkness. Review image quality.',
      expected: 'Subject is identifiable (though possibly less clear) at 30ft in IR mode.',
    },
    {
      id: 'cam-ir-deactivates',
      title: 'IR deactivates in daylight',
      description: 'Increase ambient lighting to daylight levels. Observe camera mode.',
      expected: 'IR mode deactivates and camera switches back to color mode in daylight.',
    },
  ],
  'color-night-vision': [
    {
      id: 'cam-cnv-activates',
      title: 'Color night vision activates at low light threshold',
      description: 'Reduce ambient light to low light conditions. Observe camera behavior.',
      expected: 'Camera switches to color night vision mode (not IR black-and-white) at the configured threshold.',
    },
    {
      id: 'cam-cnv-accuracy',
      title: 'Color accuracy in low light',
      description: 'Place a colorful object in frame during color night vision mode. Review the stream.',
      expected: 'Colors are reasonably accurate and the image is usably bright in low light.',
    },
    {
      id: 'cam-cnv-vs-ir',
      title: 'Compare color night vision vs IR mode quality',
      description: 'Toggle between color night vision and standard IR mode. Compare image quality.',
      expected: 'Color night vision provides better color information; IR provides better range in very low light.',
    },
  ],
  'hdr': [
    {
      id: 'cam-hdr-high-contrast',
      title: 'HDR captures detail in high-contrast scenes',
      description: 'Frame a scene with both very bright and very dark areas (e.g., window facing outside). Enable HDR.',
      expected: 'HDR image preserves detail in both highlights and shadows better than non-HDR.',
    },
    {
      id: 'cam-hdr-compare',
      title: 'Compare HDR on vs off in bright conditions',
      description: 'Toggle HDR on and off while viewing a high-contrast scene. Compare screenshots.',
      expected: 'HDR-on image shows less blown-out highlights and more visible shadow detail.',
    },
  ],
  'res-1080p': [],
  'res-2k': [
    {
      id: 'cam-2k-stable',
      title: '2K stream stable in app',
      description: 'Set camera to 2K resolution and stream live view for 5 minutes.',
      expected: 'Stream is stable and plays without buffering at 2K resolution.',
    },
    {
      id: 'cam-2k-metadata',
      title: '2K resolution confirmed in recording metadata',
      description: 'Download a recorded clip and check its properties/metadata.',
      expected: 'Recording metadata shows resolution at or near 2K (2560×1440).',
    },
  ],
  'res-4k': [
    {
      id: 'cam-4k-stable',
      title: '4K stream stable in app',
      description: 'Set camera to 4K resolution and stream live view for 5 minutes.',
      expected: 'Stream plays stably at 4K without excessive buffering.',
    },
    {
      id: 'cam-4k-quality',
      title: '4K recording quality and file size verification',
      description: 'Trigger an event and download the 4K recorded clip. Check resolution and file size.',
      expected: 'Recording is true 4K resolution; file size is consistent with expected bitrate.',
    },
    {
      id: 'cam-4k-bandwidth',
      title: '4K stream bandwidth requirements',
      description: 'Monitor network bandwidth usage while streaming 4K live view.',
      expected: 'Bandwidth usage is within expected range per product spec for 4K streaming.',
    },
  ],
  'two-way-audio': [
    {
      id: 'cam-2way-initiate',
      title: 'Initiate talk from app and be heard',
      description: 'Open live view and tap the talk button. Speak into the phone. Verify audio is heard at camera location.',
      expected: 'Audio from the phone is audible at the camera location with acceptable clarity.',
    },
    {
      id: 'cam-2way-remote-audio',
      title: 'Remote audio heard in app',
      description: 'Speak near the camera while monitoring audio in the app live view.',
      expected: 'Audio captured at the camera is audible in the app.',
    },
    {
      id: 'cam-2way-latency',
      title: 'Two-way audio latency under 500ms',
      description: 'Clap near the camera and measure delay until heard in the app.',
      expected: 'Audio latency is under 500ms for a usable conversation.',
    },
    {
      id: 'cam-2way-echo',
      title: 'Echo cancellation working',
      description: 'Enable two-way audio with speaker and microphone active. Check for echo feedback.',
      expected: 'Echo cancellation prevents feedback loop; conversation is clear.',
    },
  ],
  'listen-only': [
    {
      id: 'cam-listen-stream',
      title: 'Listen-only audio streams correctly',
      description: 'Open live view and enable audio. Speak near the camera. Verify audio is heard in app.',
      expected: 'Audio from camera microphone streams correctly to the app.',
    },
    {
      id: 'cam-listen-no-talk',
      title: 'No microphone talk access from app',
      description: 'Attempt to access a talk/microphone button in the app for this listen-only camera.',
      expected: 'No talk button or microphone access is available in the app interface.',
    },
  ],
  'motion-detection': [
    {
      id: 'cam-motion-trigger',
      title: 'Motion detection triggers event within 5 seconds',
      description: 'Move in front of camera and wait for motion detection event.',
      expected: 'Motion event appears in history and/or notification is received within 5 seconds.',
    },
    {
      id: 'cam-motion-sensitivity',
      title: 'Motion sensitivity adjustment (low/medium/high)',
      description: 'Change sensitivity to low: verify small movements do not trigger. Change to high: verify they do.',
      expected: 'Sensitivity settings appropriately change the threshold for motion triggers.',
    },
    {
      id: 'cam-motion-history',
      title: 'Motion event appears in history',
      description: 'Trigger a motion event and check the event history in the app.',
      expected: 'Motion event appears in event history with correct timestamp and thumbnail.',
    },
  ],
  'person-detection': [
    {
      id: 'cam-person-tp',
      title: 'Person detection true positive',
      description: 'Walk in front of camera. Wait for person detection event.',
      expected: 'Person detection event is triggered and labeled "Person" in the event history.',
    },
    {
      id: 'cam-person-tn',
      title: 'Non-person motion does not trigger person event',
      description: 'Move a non-person object (e.g., balloon, flag) in front of camera.',
      expected: 'A motion event may be triggered but it is not labeled as a "Person" event.',
    },
    {
      id: 'cam-person-notify',
      title: 'Person detection notification received',
      description: 'Enable person detection notifications. Walk in front of camera.',
      expected: 'Push notification labeled "Person Detected" is received within 30 seconds.',
    },
  ],
  'package-detection': [
    {
      id: 'cam-pkg-placed',
      title: 'Package placed in frame triggers package event',
      description: 'Place a box or package in the camera field of view.',
      expected: 'Package detection event is triggered and labeled "Package" in event history.',
    },
    {
      id: 'cam-pkg-removed',
      title: 'Package removal triggers event',
      description: 'After package is detected, remove it from the frame.',
      expected: 'Package removal event is logged in event history.',
    },
    {
      id: 'cam-pkg-no-false',
      title: 'No false package detections from static objects',
      description: 'Place permanent static objects (pots, furniture) in the frame. Monitor over 1 hour.',
      expected: 'No false package detection events are generated from static objects.',
    },
  ],
  'vehicle-detection': [
    {
      id: 'cam-vehicle-tp',
      title: 'Vehicle in frame triggers vehicle event',
      description: 'Drive or push a vehicle through the camera field of view.',
      expected: 'Vehicle detection event is triggered and labeled "Vehicle" in event history.',
    },
    {
      id: 'cam-vehicle-tn',
      title: 'Person walking does not trigger vehicle event',
      description: 'Walk through the camera field of view.',
      expected: 'Person event or motion event is triggered but not a vehicle event.',
    },
  ],
  'animal-detection': [
    {
      id: 'cam-animal-tp',
      title: 'Animal in frame triggers animal event',
      description: 'Have a pet or animal walk through the camera field of view.',
      expected: 'Animal detection event is triggered and labeled "Animal" in event history.',
    },
    {
      id: 'cam-animal-vs-person',
      title: 'Animal vs person differentiation',
      description: 'Walk through camera field of view, then have an animal walk through separately.',
      expected: 'Human generates a "Person" event; animal generates an "Animal" event.',
    },
  ],
  'custom-zones': [
    {
      id: 'cam-zone-create',
      title: 'Create motion zone covering half frame',
      description: 'In camera settings, create a custom motion zone that covers only half the camera frame.',
      expected: 'Zone is created and saved successfully.',
    },
    {
      id: 'cam-zone-outside',
      title: 'Motion outside zone does not trigger event',
      description: 'Move in the area outside the defined motion zone.',
      expected: 'No motion event is triggered by movement outside the active zone.',
    },
    {
      id: 'cam-zone-inside',
      title: 'Motion inside zone triggers event',
      description: 'Move within the defined motion zone.',
      expected: 'Motion event is triggered by movement inside the active zone.',
    },
    {
      id: 'cam-zone-persist',
      title: 'Zone persists after camera reboot',
      description: 'After defining the zone, reboot the camera. Check zone settings.',
      expected: 'Custom zone settings are preserved after reboot.',
    },
  ],
  'distance-detection': [
    {
      id: 'cam-dist-threshold',
      title: 'Object beyond threshold does not trigger',
      description: 'Set a distance threshold. Place object or walk beyond that distance from the camera.',
      expected: 'No detection event is triggered for the object beyond the threshold.',
    },
    {
      id: 'cam-dist-within',
      title: 'Object within threshold triggers event',
      description: 'Move within the configured distance threshold.',
      expected: 'Detection event is triggered for movement within the threshold distance.',
    },
  ],
  'package-detection-edge': [
    { id: 'cam-pkg-edge-tp', title: 'Package detected on-device (edge)', description: 'Place a package in frame. Verify detection occurs without cloud processing delay.', expected: 'Package event fires within 3 seconds on-device, labeled "Package" in history.' },
    { id: 'cam-pkg-edge-latency', title: 'Edge package detection latency', description: 'Time from package placement to event notification.', expected: 'Notification received within 5 seconds of package placement.' },
  ],
  'vehicle-detection-edge': [
    { id: 'cam-veh-edge-tp', title: 'Vehicle detected on-device (edge)', description: 'Drive or push a vehicle through the FOV. Verify on-device detection.', expected: 'Vehicle event triggered and labeled "Vehicle" within 5 seconds without cloud dependency.' },
    { id: 'cam-veh-edge-tn', title: 'Edge vehicle — person does not false trigger', description: 'Walk through the FOV. Verify person does not register as vehicle.', expected: 'Person event fires, not a vehicle event.' },
  ],
  'animal-detection-edge': [
    { id: 'cam-ani-edge-tp', title: 'Animal detected on-device (edge)', description: 'Have a pet walk through the FOV. Verify on-device animal detection.', expected: 'Animal event fires on-device within 5 seconds.' },
    { id: 'cam-ani-edge-vs-person', title: 'Edge animal vs person differentiation', description: 'Walk through FOV, then have an animal walk through. Verify labels differ.', expected: 'Human labeled "Person", animal labeled "Animal" — both on-device.' },
  ],
  'motion-detection-cloud': [
    { id: 'cam-motion-cloud-trigger', title: 'Cloud motion detection triggers event', description: 'Move in front of camera. Verify cloud-processed motion event is generated.', expected: 'Cloud motion event appears in history, may have slightly higher latency than edge.' },
    { id: 'cam-motion-cloud-accuracy', title: 'Cloud motion detection accuracy', description: 'Compare cloud detection results with actual motion events over 10 triggers.', expected: 'Cloud detection accuracy matches or exceeds edge detection for same events.' },
  ],
  'person-detection-cloud': [
    { id: 'cam-person-cloud-tp', title: 'Cloud person detection true positive', description: 'Walk in front of camera. Verify cloud-side person detection event.', expected: 'Person event labeled and processed via cloud within 10 seconds.' },
    { id: 'cam-person-cloud-accuracy', title: 'Cloud person detection accuracy vs edge', description: 'Run 10 person detection events and compare cloud vs edge label accuracy.', expected: 'Cloud person detection provides same or better accuracy; may improve with model updates.' },
  ],
  'custom-zones-cloud': [
    { id: 'cam-zone-cloud-create', title: 'Cloud-processed custom zone creation', description: 'Create a motion zone in app. Verify zone is processed and enforced server-side.', expected: 'Zone saves and cloud only triggers events for motion within defined zone.' },
    { id: 'cam-zone-cloud-outside', title: 'Cloud zone — motion outside does not trigger', description: 'Move outside the defined zone boundary.', expected: 'No cloud event generated for out-of-zone motion.' },
  ],
  'distance-detection-cloud': [
    { id: 'cam-dist-cloud-threshold', title: 'Cloud distance threshold enforcement', description: 'Set distance threshold. Move beyond it and verify cloud does not trigger.', expected: 'Cloud processing respects distance threshold — no event beyond boundary.' },
    { id: 'cam-dist-cloud-within', title: 'Cloud distance detection within threshold', description: 'Move within configured distance. Verify cloud event fires.', expected: 'Cloud detection event generated for in-range movement.' },
  ],
  'local-sd': [
    {
      id: 'cam-sd-detect',
      title: 'SD card detected and formatted',
      description: 'Insert a compatible SD card. Check camera storage settings in the app.',
      expected: 'SD card is detected, formatted if necessary, and shows available space.',
    },
    {
      id: 'cam-sd-record',
      title: 'Recording saves to SD card',
      description: 'Trigger a recording event with SD card inserted. Check card contents.',
      expected: 'Recording file is saved to the SD card.',
    },
    {
      id: 'cam-sd-playback',
      title: 'Playback from SD card in app',
      description: 'Navigate to local storage or playback section in the app. Play a clip from the SD card.',
      expected: 'Clip from SD card plays correctly in the app.',
    },
    {
      id: 'cam-sd-full',
      title: 'SD card full behavior',
      description: 'Fill the SD card to capacity. Observe camera behavior.',
      expected: 'Camera either overwrites oldest recordings or alerts about full storage per spec.',
    },
  ],
  'cloud-recording': [
    {
      id: 'cam-cloud-save',
      title: 'Cloud recording saves event clip',
      description: 'Trigger an event (motion, person, etc.). Wait for cloud upload.',
      expected: 'Event clip is uploaded and available in cloud storage.',
    },
    {
      id: 'cam-cloud-accessible',
      title: 'Cloud clip accessible in app history within 2 minutes',
      description: 'After triggering an event, check app history for the clip.',
      expected: 'Clip appears in app event history within 2 minutes of the event.',
    },
    {
      id: 'cam-cloud-quota',
      title: 'Cloud storage quota displayed',
      description: 'Check cloud storage usage in app subscription or camera settings.',
      expected: 'Cloud storage quota (used/total) is visible in the app.',
    },
  ],
  'continuous-recording': [
    {
      id: 'cam-cont-one-hour',
      title: 'Continuous recording active for 1 hour without gap',
      description: 'Enable continuous recording and let it run for 1 hour. Review the timeline.',
      expected: 'Recording timeline shows continuous coverage for the full hour with no gaps.',
    },
    {
      id: 'cam-cont-accessible',
      title: 'Continuous recording accessible in playback',
      description: 'Navigate to the timeline/playback view and scrub through the continuous recording.',
      expected: 'Continuous recording is accessible and playable from the timeline.',
    },
  ],
  'event-only-recording': [
    {
      id: 'cam-evonly-saves',
      title: 'Only triggered events are saved',
      description: 'Enable event-only recording. Trigger one event; allow several minutes of inactivity.',
      expected: 'Only the triggered event is saved; idle periods have no recording.',
    },
    {
      id: 'cam-evonly-no-idle',
      title: 'No recording during idle periods',
      description: 'Review storage after 30 minutes of no motion.',
      expected: 'No recordings saved during the idle period.',
    },
  ],
  'privacy-shutter': [
    {
      id: 'cam-shutter-close',
      title: 'Privacy shutter closes via app',
      description: 'Open camera settings in app and activate the privacy shutter.',
      expected: 'Shutter closes and live view shows a blank or blocked image.',
    },
    {
      id: 'cam-shutter-blocked',
      title: 'Live view shows blocked image when shutter closed',
      description: 'Verify live view while shutter is in closed position.',
      expected: 'Live view shows no camera image (shutter is blocking the lens).',
    },
    {
      id: 'cam-shutter-open',
      title: 'Privacy shutter opens via app',
      description: 'Open camera settings in app and deactivate the privacy shutter.',
      expected: 'Shutter opens and live view resumes showing the camera feed.',
    },
  ],
  'built-in-siren': [
    {
      id: 'cam-siren-triggers',
      title: 'Camera siren activates on alarm trigger',
      description: 'Trigger an alarm condition on the hub. Verify camera siren activation.',
      expected: 'Camera siren activates and is audible.',
    },
    {
      id: 'cam-siren-volume',
      title: 'Siren volume audible at 10ft',
      description: 'Activate the camera siren and measure audibility at 10 feet.',
      expected: 'Siren is clearly audible at 10 feet.',
    },
    {
      id: 'cam-siren-cancel',
      title: 'Siren cancels from app',
      description: 'With siren active, cancel it from the camera controls in the app.',
      expected: 'Siren stops within 3 seconds of app cancel action.',
    },
  ],
  'doorbell-button': [
    {
      id: 'cam-dbtn-notify',
      title: 'Doorbell button press → app notification within 5 seconds',
      description: 'Press the doorbell button and monitor the app for notification.',
      expected: 'App notification arrives within 5 seconds of button press.',
    },
    {
      id: 'cam-dbtn-live-open',
      title: 'Doorbell press auto-opens live view in app',
      description: 'Press the doorbell button while monitoring the app.',
      expected: 'App automatically opens the live view or incoming call screen.',
    },
  ],
  'wired-chime': [
    {
      id: 'cam-chime-sounds',
      title: 'Wired chime sounds on doorbell press',
      description: 'Press the doorbell button with wired chime connected.',
      expected: 'Wired chime sounds within 2 seconds of button press.',
    },
    {
      id: 'cam-chime-volume',
      title: 'Chime volume level appropriate',
      description: 'Press doorbell and evaluate chime volume.',
      expected: 'Chime volume is clearly audible throughout the intended space.',
    },
    {
      id: 'cam-chime-compat',
      title: 'Chime compatibility verified',
      description: 'Test with supported mechanical and digital chime types.',
      expected: 'Chime operates correctly with supported chime types per compatibility list.',
    },
  ],
  'optical-zoom': [
    {
      id: 'cam-zoom-range',
      title: 'Optical zoom range end-to-end',
      description: 'Zoom from minimum to maximum magnification. Verify both ends of the range.',
      expected: 'Camera zooms smoothly from 1x to max optical zoom without distortion.',
    },
    {
      id: 'cam-zoom-persist',
      title: 'Zoom level persists in recording',
      description: 'Set a zoom level and trigger a recording event.',
      expected: 'Recording clip reflects the zoom level that was set.',
    },
    {
      id: 'cam-zoom-quality',
      title: 'Image quality maintained at max zoom',
      description: 'Zoom to maximum optical zoom and evaluate image sharpness.',
      expected: 'Image remains sharp at maximum optical zoom without visible degradation.',
    },
  ],
  'form-doorbell': [],
  'form-bullet-dome': [],
  'form-floodlight': [
    {
      id: 'cam-flood-motion',
      title: 'Floodlight activates on motion',
      description: 'Trigger the camera motion detection at night or in dark conditions.',
      expected: 'Floodlight activates automatically when motion is detected.',
    },
    {
      id: 'cam-flood-brightness',
      title: 'Floodlight brightness levels',
      description: 'Adjust floodlight brightness from the app at different levels.',
      expected: 'Floodlight brightness changes according to the selected level.',
    },
    {
      id: 'cam-flood-manual',
      title: 'Floodlight manual control from app',
      description: 'Manually toggle the floodlight on and off from the app.',
      expected: 'Floodlight turns on and off in response to app commands within 3 seconds.',
    },
    {
      id: 'cam-flood-schedule',
      title: 'Floodlight schedule',
      description: 'Create a floodlight schedule in the app and verify it fires at the scheduled time.',
      expected: 'Floodlight activates and deactivates according to the configured schedule.',
    },
  ],
  'form-spotlight': [
    {
      id: 'cam-spot-event',
      title: 'Spotlight activates on motion or event',
      description: 'Trigger a motion or detection event at night or in dark conditions.',
      expected: 'Spotlight activates automatically when an event is detected.',
    },
    {
      id: 'cam-spot-manual',
      title: 'Spotlight manual toggle from app',
      description: 'Manually turn the spotlight on and off from the app.',
      expected: 'Spotlight responds to app toggle commands within 3 seconds.',
    },
  ],
  'light-spotlight': [
    {
      id: 'cam-light-spot-event',
      title: 'Spotlight activates on event',
      description: 'Trigger a motion or detection event in low light. Verify spotlight activates.',
      expected: 'Spotlight turns on automatically within 2 seconds of event trigger.',
    },
    {
      id: 'cam-light-spot-manual',
      title: 'Spotlight manual control',
      description: 'Toggle spotlight on and off manually from the app.',
      expected: 'Spotlight responds to manual toggle within 3 seconds.',
    },
    {
      id: 'cam-light-spot-brightness',
      title: 'Spotlight brightness adjustment',
      description: 'Adjust spotlight brightness to low, medium, and high from app settings.',
      expected: 'Brightness level changes visibly and matches the selected setting.',
    },
  ],
  'light-redblue-strobe': [
    {
      id: 'cam-strobe-alarm',
      title: 'Red/Blue strobe activates on alarm',
      description: 'Trigger an alarm event and verify the red/blue strobe activates.',
      expected: 'Red/blue strobe activates within 3 seconds of alarm trigger.',
    },
    {
      id: 'cam-strobe-manual',
      title: 'Red/Blue strobe manual trigger',
      description: 'Manually activate the strobe from the app.',
      expected: 'Strobe activates and alternates red/blue as expected.',
    },
    {
      id: 'cam-strobe-cancel',
      title: 'Red/Blue strobe cancels on alarm clear',
      description: 'Clear or cancel the alarm event and verify the strobe stops.',
      expected: 'Strobe stops within 3 seconds of alarm being cancelled.',
    },
  ],
  'light-floodlight': [
    {
      id: 'cam-light-flood-motion',
      title: 'Floodlight activates on motion',
      description: 'Trigger motion detection in dark conditions and verify floodlight response.',
      expected: 'Floodlight activates automatically when motion is detected.',
    },
    {
      id: 'cam-light-flood-brightness',
      title: 'Floodlight brightness levels',
      description: 'Adjust floodlight brightness from app at low, medium, and high settings.',
      expected: 'Floodlight brightness changes according to the selected level.',
    },
    {
      id: 'cam-light-flood-manual',
      title: 'Floodlight manual control',
      description: 'Manually toggle the floodlight on and off from the app.',
      expected: 'Floodlight turns on and off within 3 seconds of app command.',
    },
    {
      id: 'cam-light-flood-schedule',
      title: 'Floodlight schedule',
      description: 'Create a floodlight on/off schedule and verify it fires at the correct time.',
      expected: 'Floodlight activates and deactivates according to the configured schedule.',
    },
  ],
  'form-pan-tilt': [
    {
      id: 'cam-pt-pan',
      title: 'Pan range full sweep',
      description: 'Sweep the camera from left to right end of pan range via app controls.',
      expected: 'Camera pans the full range without stalling or skipping.',
    },
    {
      id: 'cam-pt-tilt',
      title: 'Tilt range full sweep',
      description: 'Sweep the camera from top to bottom of tilt range via app controls.',
      expected: 'Camera tilts the full range without stalling or skipping.',
    },
    {
      id: 'cam-pt-home',
      title: 'Return to home position',
      description: 'Move the camera to a non-home position. Trigger return to home.',
      expected: 'Camera returns to the configured home position accurately.',
    },
    {
      id: 'cam-pt-app-control',
      title: 'Pan/tilt via app control',
      description: 'Use the app directional controls to pan and tilt the camera.',
      expected: 'Camera responds to app pan/tilt commands with low latency.',
    },
  ],
  'form-bulb': [],

  // ─── SENSOR ────────────────────────────────────────────────────────────────
  'door-window': [
    {
      id: 'sensor-dw-open',
      title: 'Open door/window triggers within 2 seconds',
      description: 'With sensor paired and system armed, open the door or window the sensor is mounted on.',
      expected: 'Sensor triggers and hub/app shows triggered state within 2 seconds.',
    },
    {
      id: 'sensor-dw-close',
      title: 'Close door/window returns to normal state',
      description: 'After triggering, close the door or window.',
      expected: 'Sensor returns to normal state in hub/app within 5 seconds of closing.',
    },
    {
      id: 'sensor-dw-app-state',
      title: 'Door/window state accurate in app',
      description: 'Open and close the door several times. Verify app state after each action.',
      expected: 'App state (open/closed) matches actual door/window position each time.',
    },
  ],
  'motion-pir': [
    {
      id: 'sensor-pir-trigger',
      title: 'Walk through PIR zone triggers motion within 3 seconds',
      description: 'Walk through the PIR sensor detection zone.',
      expected: 'Motion is detected and hub/app shows triggered state within 3 seconds.',
    },
    {
      id: 'sensor-pir-no-false',
      title: 'Remain still — no false trigger',
      description: 'Stand motionless within the PIR zone for 2 minutes.',
      expected: 'No motion events are triggered while subject is motionless.',
    },
    {
      id: 'sensor-pir-reset',
      title: 'PIR resets after timeout',
      description: 'Trigger the sensor, then leave the zone. Wait for reset timeout.',
      expected: 'Sensor resets to ready state after the specified timeout period.',
    },
  ],
  'glass-break': [
    {
      id: 'sensor-gb-trigger',
      title: 'Glass break sound triggers sensor',
      description: 'Use a canned glass break test device or approved test method near the sensor.',
      expected: 'Sensor triggers and alarm activates within 3 seconds of the glass break signal.',
    },
    {
      id: 'sensor-gb-no-false',
      title: 'Non-glass sounds do not trigger',
      description: 'Create loud non-glass sounds near the sensor (clapping, slamming door).',
      expected: 'Sensor does not trigger from non-glass-break sounds.',
    },
    {
      id: 'sensor-gb-range',
      title: 'Glass break range test at 15ft',
      description: 'Perform glass break test at 15 feet from the sensor.',
      expected: 'Sensor detects the glass break signal at 15 feet.',
    },
  ],
  'smoke-ionization': [
    {
      id: 'sensor-smoke-ion-trigger',
      title: 'Ionization smoke test triggers alarm',
      description: 'Use canned smoke aerosol near the ionization smoke detector.',
      expected: 'Alarm sounds within 30 seconds and hub receives the smoke alarm signal.',
    },
    {
      id: 'sensor-smoke-ion-hub',
      title: 'Hub receives smoke alarm signal',
      description: 'Trigger the smoke detector and verify hub signal.',
      expected: 'Hub logs smoke alarm event and app notification is sent.',
    },
  ],
  'smoke-photoelectric': [
    {
      id: 'sensor-smoke-photo-trigger',
      title: 'Photoelectric smoke test triggers alarm',
      description: 'Simulate smoldering smoke near the photoelectric sensor using approved test method.',
      expected: 'Alarm sounds and hub receives the smoke alarm signal.',
    },
    {
      id: 'sensor-smoke-photo-hub',
      title: 'Hub receives photoelectric smoke signal',
      description: 'Trigger the photoelectric smoke detector and verify hub signal.',
      expected: 'Hub logs smoke alarm event and app notification is sent.',
    },
  ],
  'co-detector': [
    {
      id: 'sensor-co-trigger',
      title: 'CO test gas triggers alarm within spec',
      description: 'Apply CO test gas (approved concentration) near the CO detector.',
      expected: 'Alarm sounds within the specified response time and hub receives the CO alarm signal.',
    },
    {
      id: 'sensor-co-hub',
      title: 'Hub receives CO alarm signal',
      description: 'Trigger CO detector and verify hub signal.',
      expected: 'Hub logs CO alarm event distinctly from intrusion alarms and app notification is sent.',
    },
  ],
  'flood-water': [
    {
      id: 'sensor-flood-trigger',
      title: 'Water contact triggers alarm within 5 seconds',
      description: 'Apply water to the sensor probes.',
      expected: 'Flood alarm triggers and hub/app shows flood alert within 5 seconds of water contact.',
    },
    {
      id: 'sensor-flood-clear',
      title: 'Sensor returns to normal when water removed',
      description: 'After flood trigger, remove water from sensor probes.',
      expected: 'Sensor returns to normal state in hub/app within 10 seconds of water removal.',
    },
  ],
  'freeze': [
    {
      id: 'sensor-freeze-trigger',
      title: 'Freeze alert triggers below temperature threshold',
      description: 'Lower the temperature at the sensor below the configured freeze threshold.',
      expected: 'Freeze alert is triggered and appears in hub/app.',
    },
    {
      id: 'sensor-freeze-clear',
      title: 'Freeze alert clears when temperature normalizes',
      description: 'Bring temperature back above the freeze threshold.',
      expected: 'Freeze alert clears in hub/app when temperature is above threshold.',
    },
  ],
  'panic-button': [
    {
      id: 'sensor-panic-trigger',
      title: 'Panic button triggers immediate alarm',
      description: 'Press the panic button.',
      expected: 'Panic alarm triggers immediately (within 1 second) on hub and app.',
    },
    {
      id: 'sensor-panic-distinct',
      title: 'Panic alarm distinct from intrusion alarm in app',
      description: 'Trigger panic alarm and compare notification to a standard intrusion alarm.',
      expected: 'App labels the alert as a panic alarm, distinct from zone intrusion alerts.',
    },
    {
      id: 'sensor-panic-cancel',
      title: 'Panic alarm cancellable from app',
      description: 'After panic alarm is active, cancel it from the app.',
      expected: 'Panic alarm is cancelled from the app interface.',
    },
  ],
  'keyfob': [
    {
      id: 'sensor-keyfob-arm',
      title: 'Key fob arm button arms system',
      description: 'Press the arm button on the key fob.',
      expected: 'System arms and hub/app reflects the armed state.',
    },
    {
      id: 'sensor-keyfob-disarm',
      title: 'Key fob disarm button disarms system',
      description: 'With system armed, press the disarm button on the key fob.',
      expected: 'System disarms and hub/app reflects the disarmed state.',
    },
    {
      id: 'sensor-keyfob-panic',
      title: 'Key fob panic button triggers panic alarm',
      description: 'Press the panic button on the key fob.',
      expected: 'Panic alarm is triggered on hub and app.',
    },
    {
      id: 'sensor-keyfob-range',
      title: 'Key fob range test at 30ft',
      description: 'Press key fob buttons at 30 feet from the hub.',
      expected: 'Hub receives and responds to key fob commands at 30 feet.',
    },
  ],
  'rf-345mhz': [
    {
      id: 'sensor-rf345-receive',
      title: '345MHz signal received by hub',
      description: 'Trigger a 345MHz sensor and verify hub reception.',
      expected: 'Hub receives the 345MHz signal and registers the event.',
    },
    {
      id: 'sensor-rf345-range',
      title: '345MHz range test at 50ft',
      description: 'Trigger the sensor at 50 feet from the hub.',
      expected: 'Hub receives the 345MHz signal at 50 feet.',
    },
    {
      id: 'sensor-rf345-interference',
      title: '345MHz interference test',
      description: 'Operate the sensor near other 345MHz or RF devices.',
      expected: 'Hub still reliably receives signals without false triggers.',
    },
  ],
  'rf-433mhz': [
    {
      id: 'sensor-rf433-receive',
      title: '433MHz signal received by hub',
      description: 'Trigger a 433MHz sensor and verify hub reception.',
      expected: 'Hub receives the 433MHz signal and registers the event.',
    },
    {
      id: 'sensor-rf433-range',
      title: '433MHz range test at 50ft',
      description: 'Trigger the sensor at 50 feet from the hub.',
      expected: 'Hub receives the 433MHz signal at 50 feet.',
    },
  ],
  'zwave-908mhz': [
    {
      id: 'sensor-zwave-pair',
      title: 'Z-Wave 908MHz sensor pairing',
      description: 'Pair Z-Wave sensor to hub using inclusion mode.',
      expected: 'Z-Wave sensor pairs and appears in hub/app device list.',
    },
    {
      id: 'sensor-zwave-signal',
      title: 'Z-Wave signal strength reported',
      description: 'Check Z-Wave device details in the hub or app for signal strength.',
      expected: 'Z-Wave signal strength (RSSI or node quality) is visible.',
    },
    {
      id: 'sensor-zwave-mesh',
      title: 'Z-Wave mesh routing',
      description: 'Place Z-Wave device beyond direct hub range. Verify routing through intermediate nodes.',
      expected: 'Device communicates with hub via Z-Wave mesh routing.',
    },
  ],
  'zigbee-2_4ghz': [
    {
      id: 'sensor-zigbee-pair',
      title: 'Zigbee 2.4GHz sensor pairing',
      description: 'Pair Zigbee sensor to hub using the pairing flow.',
      expected: 'Zigbee sensor pairs successfully and appears in hub/app device list.',
    },
    {
      id: 'sensor-zigbee-mesh',
      title: 'Zigbee mesh routing',
      description: 'Place Zigbee device at range edge. Verify routing through Zigbee coordinator or repeater.',
      expected: 'Device communicates with hub via Zigbee mesh.',
    },
    {
      id: 'sensor-zigbee-wifi-interference',
      title: 'Zigbee interference with 2.4GHz WiFi',
      description: 'Operate Zigbee device while 2.4GHz WiFi traffic is heavy on overlapping channels.',
      expected: 'Zigbee maintains reliable communication with acceptable latency despite WiFi traffic.',
    },
  ],
  'tamper-detection': [
    {
      id: 'sensor-tamper-open',
      title: 'Open sensor cover triggers tamper alert',
      description: 'Remove or open the sensor cover to activate the tamper switch.',
      expected: 'Hub and app receive a tamper alert within 5 seconds.',
    },
    {
      id: 'sensor-tamper-distinct',
      title: 'Tamper alert distinct from zone trigger',
      description: 'Compare tamper alert notification to normal zone trigger notification.',
      expected: 'App labels the event as a tamper alert, not a zone open/close event.',
    },
    {
      id: 'sensor-tamper-clear',
      title: 'Tamper clears when cover replaced',
      description: 'Replace the sensor cover after tamper is triggered.',
      expected: 'Tamper alert clears in hub and app after cover is properly closed.',
    },
  ],
  'led-indicator': [
    {
      id: 'sensor-led-trigger',
      title: 'LED blinks on trigger',
      description: 'Trigger the sensor and observe the LED indicator.',
      expected: 'LED blinks or illuminates when sensor is triggered.',
    },
    {
      id: 'sensor-led-battery',
      title: 'LED indicates low battery',
      description: 'Simulate or observe low battery condition.',
      expected: 'LED provides a low battery indicator (e.g., different blink pattern).',
    },
    {
      id: 'sensor-led-tamper',
      title: 'LED behavior on tamper',
      description: 'Open sensor cover to trigger tamper while observing LED.',
      expected: 'LED provides a distinct indication during tamper condition.',
    },
  ],
  'bypass-capable': [
    {
      id: 'sensor-bypass-app',
      title: 'Bypass sensor via app',
      description: 'Navigate to sensor settings in app and apply a bypass to the sensor.',
      expected: 'Sensor is marked as bypassed in the app.',
    },
    {
      id: 'sensor-bypass-keypad',
      title: 'Bypass sensor via keypad',
      description: 'Use bypass entry mode on keypad to bypass the specific sensor zone.',
      expected: 'Sensor is bypassed via keypad.',
    },
    {
      id: 'sensor-bypass-no-alarm',
      title: 'Bypassed sensor does not trigger alarm',
      description: 'With sensor bypassed, arm the system and trigger the bypassed sensor.',
      expected: 'No alarm is triggered when the bypassed sensor is activated.',
    },
    {
      id: 'sensor-bypass-remove',
      title: 'Remove bypass restores normal behavior',
      description: 'Remove the bypass from the sensor and trigger it.',
      expected: 'Sensor triggers normally after bypass is removed.',
    },
  ],
  'pet-immune': [
    {
      id: 'sensor-pet-small-no-trigger',
      title: 'Small pet (< 40lbs) does not trigger motion sensor',
      description: 'Allow a small pet (or simulate with equivalent mass) to walk through the PIR zone.',
      expected: 'No motion event is triggered by the small pet.',
    },
    {
      id: 'sensor-pet-human-triggers',
      title: 'Human movement still triggers correctly',
      description: 'Walk through the PIR zone after confirming pet immunity.',
      expected: 'Motion event is triggered correctly by a human.',
    },
  ],
  'long-range': [
    {
      id: 'sensor-lr-100ft',
      title: 'Signal test at 100ft (open space)',
      description: 'Trigger sensor from 100 feet in an open space.',
      expected: 'Hub receives the signal reliably at 100 feet.',
    },
    {
      id: 'sensor-lr-50ft-walls',
      title: 'Signal test at 50ft through 2 walls',
      description: 'Trigger sensor at 50 feet with 2 walls between sensor and hub.',
      expected: 'Hub receives the signal at 50 feet through 2 interior walls.',
    },
  ],

  // ─── APP ───────────────────────────────────────────────────────────────────
  'ios': [
    {
      id: 'app-ios-layout',
      title: 'iOS-specific UI layout correct',
      description: 'Open the app on an iOS device. Navigate through all major screens.',
      expected: 'All screens render correctly with iOS-native UI conventions and no layout issues.',
    },
    {
      id: 'app-ios-push',
      title: 'iOS push notification delivery',
      description: 'Trigger an event. Verify push notification is delivered to iOS device.',
      expected: 'Push notification is received on iOS device within 30 seconds.',
    },
    {
      id: 'app-ios-background',
      title: 'iOS background refresh',
      description: 'Background the app. Wait 10 minutes. Trigger an event and check for notification.',
      expected: 'App receives push notification while backgrounded.',
    },
    {
      id: 'app-ios-widget',
      title: 'iOS widget (if applicable)',
      description: 'Add the app widget to the iOS home screen. Verify widget data.',
      expected: 'Widget displays current system status correctly.',
    },
  ],
  'android': [
    {
      id: 'app-android-layout',
      title: 'Android-specific UI layout correct',
      description: 'Open the app on an Android device. Navigate through all major screens.',
      expected: 'All screens render correctly following Android design guidelines with no layout issues.',
    },
    {
      id: 'app-android-push',
      title: 'Android push notification delivery',
      description: 'Trigger an event. Verify push notification is delivered to Android device.',
      expected: 'Push notification is received on Android device within 30 seconds.',
    },
    {
      id: 'app-android-background',
      title: 'Android background refresh',
      description: 'Background the app on Android. Trigger an event and verify notification.',
      expected: 'App receives push notification while in background on Android.',
    },
    {
      id: 'app-android-channels',
      title: 'Android notification channels',
      description: 'Check Android notification settings for the app.',
      expected: 'App exposes appropriate notification channels (e.g., Alarm, Events, System) in Android settings.',
    },
  ],
  'auth-biometric': [
    {
      id: 'app-biometric-login',
      title: 'Face ID or Touch ID login',
      description: 'Enable biometric authentication in app settings. Log out and attempt biometric login.',
      expected: 'Biometric authentication succeeds and app opens to dashboard.',
    },
    {
      id: 'app-biometric-prompt',
      title: 'Biometric prompt appears on app open',
      description: 'Close and reopen the app.',
      expected: 'Biometric prompt appears automatically when app is opened.',
    },
    {
      id: 'app-biometric-fallback',
      title: 'Fallback to password if biometric fails',
      description: 'Attempt biometric login with wrong biometric input.',
      expected: 'After failed biometric attempt, app offers password fallback.',
    },
  ],
  'auth-2fa': [
    {
      id: 'app-2fa-code-sent',
      title: '2FA code sent via SMS or email',
      description: 'Enable 2FA in app settings. Log in to trigger 2FA.',
      expected: '2FA code is sent via configured channel (SMS or email).',
    },
    {
      id: 'app-2fa-accepted',
      title: '2FA code accepted',
      description: 'Enter the received 2FA code during login.',
      expected: 'Login succeeds after entering the correct 2FA code.',
    },
    {
      id: 'app-2fa-rejected',
      title: 'Invalid 2FA code rejected',
      description: 'Enter an incorrect 2FA code during login.',
      expected: 'Login is rejected and an error message is shown.',
    },
    {
      id: 'app-2fa-no-bypass',
      title: '2FA bypass not possible',
      description: 'Attempt to access the app by intercepting or skipping the 2FA step.',
      expected: '2FA cannot be bypassed; access is denied without a valid code.',
    },
  ],
  'app-live-view': [
    {
      id: 'app-lv-load',
      title: 'Live view loads within 5 seconds',
      description: 'Tap live view for a paired camera. Measure time to first frame.',
      expected: 'Live view begins within 5 seconds of tapping.',
    },
    {
      id: 'app-lv-stable',
      title: 'Live view stable for 60 seconds',
      description: 'Keep live view open for 60 seconds. Monitor for freeze or drop.',
      expected: 'Live view remains stable for 60 seconds without freezing or reconnecting.',
    },
    {
      id: 'app-lv-orientation',
      title: 'Live view in portrait and landscape',
      description: 'Rotate the device while in live view.',
      expected: 'Live view adjusts correctly for both portrait and landscape orientations.',
    },
    {
      id: 'app-lv-audio',
      title: 'Live view audio playback',
      description: 'Enable audio in live view for a camera with audio support.',
      expected: 'Audio streams correctly during live view.',
    },
  ],
  'app-clip-playback': [
    {
      id: 'app-clip-open',
      title: 'Open event clip from notification',
      description: 'Tap a push notification for a camera event.',
      expected: 'App opens and navigates directly to the event clip.',
    },
    {
      id: 'app-clip-play',
      title: 'Clip plays without buffering',
      description: 'Open a saved event clip from history. Play from start to finish.',
      expected: 'Clip plays smoothly without buffering pauses.',
    },
    {
      id: 'app-clip-scrub',
      title: 'Scrub clip timeline',
      description: 'Drag the timeline scrubber to different positions in the clip.',
      expected: 'Playback seeks to the correct position when scrubbing.',
    },
    {
      id: 'app-clip-download',
      title: 'Download event clip',
      description: 'Select a clip and use the download/save option.',
      expected: 'Clip is downloaded to device storage successfully.',
    },
  ],
  'app-arm-disarm': [
    {
      id: 'app-arm-away',
      title: 'Arm Away from app',
      description: 'Tap Arm Away in the app.',
      expected: 'System arms in Away mode; hub and app reflect armed state.',
    },
    {
      id: 'app-arm-home',
      title: 'Arm Home from app',
      description: 'Tap Arm Home in the app.',
      expected: 'System arms in Home mode; hub and app reflect home armed state.',
    },
    {
      id: 'app-disarm-app',
      title: 'Disarm from app',
      description: 'With system armed, tap Disarm in the app (enter PIN if required).',
      expected: 'System disarms; hub and app reflect disarmed state.',
    },
    {
      id: 'app-entry-delay',
      title: 'Entry delay countdown visible in app',
      description: 'Arm the system with an entry delay and trigger an entry sensor.',
      expected: 'App shows an entry delay countdown during the delay window.',
    },
  ],
  'app-push-notifications': [
    {
      id: 'app-push-enable',
      title: 'Enable push notifications in app',
      description: 'Navigate to notification settings and enable push notifications.',
      expected: 'Push notifications are enabled for the app on the device.',
    },
    {
      id: 'app-push-alarm',
      title: 'Trigger alarm event — push notification within 30 seconds',
      description: 'Trigger an alarm. Monitor for push notification on the device.',
      expected: 'Push notification arrives within 30 seconds of the alarm trigger.',
    },
    {
      id: 'app-push-deep-link',
      title: 'Notification opens correct screen',
      description: 'Tap the push notification from the notification shade.',
      expected: 'App opens to the relevant screen (event detail, alarm screen, etc.).',
    },
  ],
  'app-sms-notifications': [
    {
      id: 'app-sms-alarm',
      title: 'SMS notification received on alarm event',
      description: 'Trigger an alarm. Monitor the registered phone number for SMS.',
      expected: 'SMS notification is received on the registered number.',
    },
    {
      id: 'app-sms-content',
      title: 'SMS contains correct system and zone info',
      description: 'Review the content of the SMS notification.',
      expected: 'SMS includes system name and the zone or device that triggered the event.',
    },
  ],
  'app-geofencing': [
    {
      id: 'app-geo-setup',
      title: 'Set geofence boundary',
      description: 'Configure a geofence around home location in the app.',
      expected: 'Geofence is saved and active.',
    },
    {
      id: 'app-geo-leave',
      title: 'Leave boundary triggers auto-arm',
      description: 'Walk or drive beyond the geofence boundary.',
      expected: 'System arms automatically within a reasonable time of crossing the boundary.',
    },
    {
      id: 'app-geo-enter',
      title: 'Enter boundary triggers auto-disarm',
      description: 'Return within the geofence boundary.',
      expected: 'System disarms automatically when re-entering the geofence boundary.',
    },
    {
      id: 'app-geo-accuracy',
      title: 'Geofence accuracy test',
      description: 'Cross the geofence boundary multiple times and observe consistency.',
      expected: 'Geofence triggers consistently within the expected geographic boundary.',
    },
  ],
  'app-event-log': [
    {
      id: 'app-log-shows',
      title: 'Event log shows last 10 events',
      description: 'Trigger several events and then check the event log.',
      expected: 'Event log shows at least the last 10 events.',
    },
    {
      id: 'app-log-timestamp',
      title: 'Events show correct timestamp and zone',
      description: 'Compare event log timestamps to when events were triggered.',
      expected: 'Timestamps are accurate and zone information is correct for each event.',
    },
    {
      id: 'app-log-filter',
      title: 'Filter event log by event type',
      description: 'Apply event type filter in the event log (e.g., show only alarms).',
      expected: 'Event log filters correctly to show only the selected event type.',
    },
  ],
  'app-system-test': [
    {
      id: 'app-sysmode-enter',
      title: 'Enter test mode from app',
      description: 'Navigate to system test or walk-test mode in the app.',
      expected: 'App enters test mode; hub is notified and no alarm dispatches will occur.',
    },
    {
      id: 'app-sysmode-trigger',
      title: 'Sensor trigger in test mode sends no dispatch',
      description: 'Trigger a sensor while in test mode.',
      expected: 'Sensor registers in the app without dispatching an alarm signal to monitoring center.',
    },
    {
      id: 'app-sysmode-exit',
      title: 'Exit test mode and verify normal operation',
      description: 'Exit test mode from the app.',
      expected: 'System returns to normal mode; next alarm trigger would dispatch normally.',
    },
  ],
  'secondary-users': [
    {
      id: 'app-secuser-invite',
      title: 'Invite secondary user via app',
      description: 'Navigate to user management and invite a secondary user by email.',
      expected: 'Invitation email is sent to the secondary user.',
    },
    {
      id: 'app-secuser-accept',
      title: 'Secondary user accepts invite and gains access',
      description: 'Accept the invitation from the secondary user account.',
      expected: 'Secondary user can log in and access the shared system.',
    },
    {
      id: 'app-secuser-arm',
      title: 'Secondary user can arm and disarm',
      description: 'Log in as secondary user and arm/disarm the system.',
      expected: 'Secondary user can successfully arm and disarm within their permission level.',
    },
    {
      id: 'app-secuser-remove',
      title: 'Remove secondary user access',
      description: 'Remove the secondary user from the account.',
      expected: 'Secondary user loses access and cannot log in to the shared system.',
    },
  ],
  'guest-access': [
    {
      id: 'app-guest-create',
      title: 'Create guest access link',
      description: 'Generate a guest access link or code from the app.',
      expected: 'Guest access link is created and can be shared.',
    },
    {
      id: 'app-guest-limited',
      title: 'Guest access is limited to allowed features',
      description: 'Use the guest access to attempt features beyond the allowed scope.',
      expected: 'Guest access is limited to the features specified during link creation.',
    },
    {
      id: 'app-guest-expires',
      title: 'Guest access expires correctly',
      description: 'Set an expiry for the guest access. Attempt to use it after expiry.',
      expected: 'Guest access is denied after the configured expiry time.',
    },
  ],
  'multiple-locations': [
    {
      id: 'app-loc-add',
      title: 'Add second location to account',
      description: 'Set up a second system location in the app.',
      expected: 'Second location is added and accessible in the app.',
    },
    {
      id: 'app-loc-switch',
      title: 'Switch between locations in app',
      description: 'Toggle between the two configured locations.',
      expected: 'App switches context to the selected location without requiring re-login.',
    },
    {
      id: 'app-loc-status',
      title: 'Each location shows correct device status',
      description: 'View device status for each location after switching.',
      expected: 'Each location accurately displays its own devices and system status.',
    },
  ],
  'rules-engine': [
    {
      id: 'app-rules-create',
      title: 'Create automation rule',
      description: 'Create a rule with a specific trigger condition and action (e.g., motion → turn on light).',
      expected: 'Rule is created and saved successfully.',
    },
    {
      id: 'app-rules-fire',
      title: 'Trigger condition met fires action',
      description: 'Trigger the condition specified in the rule.',
      expected: 'Rule fires and the configured action executes correctly.',
    },
    {
      id: 'app-rules-disable',
      title: 'Disable rule stops execution',
      description: 'Disable the rule from the app. Trigger the rule condition.',
      expected: 'Disabled rule does not execute the action.',
    },
    {
      id: 'app-rules-persist',
      title: 'Disabled rule persists after app restart',
      description: 'Close and reopen the app after disabling a rule.',
      expected: 'Rule remains disabled after app restart.',
    },
  ],
  'smarthome-integrations': [
    {
      id: 'app-smarthome-alexa',
      title: 'Link Amazon Alexa skill from app',
      description: 'Use the integrations section in the app to link the Alexa skill.',
      expected: 'Alexa skill links successfully and devices are discoverable via Alexa.',
    },
    {
      id: 'app-smarthome-google',
      title: 'Link Google Home from app',
      description: 'Use the integrations section to link Google Home.',
      expected: 'Google Home action links successfully and devices are accessible in Google Home.',
    },
    {
      id: 'app-smarthome-homekit',
      title: 'Link Apple HomeKit from app (if applicable)',
      description: 'If HomeKit is supported, use the integrations section to link HomeKit.',
      expected: 'HomeKit integration links successfully and devices appear in the Home app.',
    },
  ],

  // ─── CAMERA SETTINGS ───────────────────────────────────────────────────────
  'cam-set-motion-sensitivity': [
    {
      id: 'cam-set-motion-sens-low',
      title: 'Motion sensitivity Low — slow walk does not trigger',
      description: 'Set motion sensitivity to Low in camera settings. Walk slowly past the camera at a distance.',
      expected: 'No motion event is triggered by slow or distant movement at Low sensitivity.',
    },
    {
      id: 'cam-set-motion-sens-high',
      title: 'Motion sensitivity High — slow walk triggers event',
      description: 'Set motion sensitivity to High. Walk slowly past the camera at the same distance used in the Low test.',
      expected: 'Motion event is triggered by slow movement at High sensitivity.',
    },
    {
      id: 'cam-set-motion-sens-medium',
      title: 'Motion sensitivity Medium — moderate threshold',
      description: 'Set motion sensitivity to Medium. Verify that only noticeable movement triggers an event.',
      expected: 'Medium sensitivity triggers on clear motion but not on very subtle or distant movement.',
    },
  ],
  'cam-set-recording-schedule': [
    {
      id: 'cam-set-rec-sched-active',
      title: 'Recording occurs within scheduled window',
      description: 'Create a recording schedule for the current time window. Trigger a motion event.',
      expected: 'Recording is saved during the scheduled window.',
    },
    {
      id: 'cam-set-rec-sched-inactive',
      title: 'No recording outside scheduled window',
      description: 'Set a recording schedule that excludes the current time. Trigger a motion event.',
      expected: 'No recording is saved outside the scheduled window.',
    },
    {
      id: 'cam-set-rec-sched-persist',
      title: 'Recording schedule persists after camera reboot',
      description: 'Configure a recording schedule, then reboot the camera. Check settings afterward.',
      expected: 'Recording schedule is preserved after reboot.',
    },
  ],
  'cam-set-night-vision': [
    {
      id: 'cam-set-nv-toggle-off',
      title: 'Night vision toggle Off — no IR in darkness',
      description: 'Turn night vision Off in settings. Reduce ambient light below 5 lux.',
      expected: 'Camera does not switch to IR mode; image may appear dark or use color night vision if available.',
    },
    {
      id: 'cam-set-nv-toggle-on',
      title: 'Night vision toggle On — IR activates in darkness',
      description: 'Turn night vision On in settings. Reduce ambient light below 5 lux.',
      expected: 'Camera activates IR night vision mode automatically in low light.',
    },
    {
      id: 'cam-set-nv-auto',
      title: 'Night vision Auto mode switches based on light',
      description: 'Set night vision to Auto. Alternate between bright and dark lighting conditions.',
      expected: 'Camera automatically switches between color and IR modes based on ambient light level.',
    },
  ],
  'cam-set-flip-rotation': [
    {
      id: 'cam-set-flip-vertical',
      title: 'Vertical flip corrects upside-down mount',
      description: 'Mount camera upside down. Enable vertical flip in settings. Check live view.',
      expected: 'Live view image is correctly oriented after enabling vertical flip.',
    },
    {
      id: 'cam-set-flip-horizontal',
      title: 'Horizontal flip mirrors the image',
      description: 'Enable horizontal flip in camera settings. Compare live view orientation.',
      expected: 'Live view image is horizontally mirrored after enabling the setting.',
    },
    {
      id: 'cam-set-rotation-persist',
      title: 'Flip/rotation setting persists after reboot',
      description: 'Set a flip or rotation option, then reboot the camera. Check the live view.',
      expected: 'Flip/rotation setting is retained and applied correctly after reboot.',
    },
  ],
  'cam-set-wdr': [
    {
      id: 'cam-set-wdr-on',
      title: 'WDR On improves high-contrast scene detail',
      description: 'Frame a scene with both bright windows and dark indoor areas. Enable WDR.',
      expected: 'Image shows improved detail in both highlights and shadows with WDR enabled.',
    },
    {
      id: 'cam-set-wdr-off',
      title: 'WDR Off — image reverts to standard range',
      description: 'Disable WDR in settings. View the same high-contrast scene.',
      expected: 'Image shows typical single-exposure dynamic range without WDR processing.',
    },
    {
      id: 'cam-set-wdr-persist',
      title: 'WDR setting persists after camera reboot',
      description: 'Enable WDR, reboot the camera, and verify the setting is retained.',
      expected: 'WDR setting is preserved after reboot.',
    },
  ],
  'cam-set-bitrate': [
    {
      id: 'cam-set-bitrate-low',
      title: 'Low bitrate reduces stream bandwidth',
      description: 'Set bitrate/quality to Low. Monitor network usage while streaming live view.',
      expected: 'Bandwidth usage decreases noticeably compared to higher bitrate setting.',
    },
    {
      id: 'cam-set-bitrate-high',
      title: 'High bitrate improves stream quality',
      description: 'Set bitrate/quality to High. Compare image sharpness to Low setting.',
      expected: 'Image quality is visibly improved at High bitrate with higher bandwidth usage.',
    },
    {
      id: 'cam-set-bitrate-persist',
      title: 'Bitrate setting persists after reboot',
      description: 'Set a specific bitrate, reboot the camera, and verify the setting.',
      expected: 'Selected bitrate is retained after camera reboot.',
    },
  ],
  'cam-set-framerate': [
    {
      id: 'cam-set-fps-low',
      title: 'Low frame rate reduces motion smoothness',
      description: 'Set frame rate to the lowest option (e.g., 15fps). View live stream with moving subject.',
      expected: 'Motion appears noticeably choppier compared to higher frame rate settings.',
    },
    {
      id: 'cam-set-fps-high',
      title: 'High frame rate produces smoother motion',
      description: 'Set frame rate to highest option (e.g., 30fps). View live stream with moving subject.',
      expected: 'Motion is smooth and fluid at the higher frame rate.',
    },
    {
      id: 'cam-set-fps-persist',
      title: 'Frame rate setting persists after reboot',
      description: 'Set frame rate, reboot the camera, and confirm the setting is retained.',
      expected: 'Frame rate setting is preserved after reboot.',
    },
  ],
  'cam-set-mic-sensitivity': [
    {
      id: 'cam-set-mic-low',
      title: 'Low mic sensitivity — quiet sounds not captured',
      description: 'Set microphone sensitivity to Low. Speak softly near the camera while monitoring audio in the app.',
      expected: 'Quiet speech is not clearly captured or is very faint at Low sensitivity.',
    },
    {
      id: 'cam-set-mic-high',
      title: 'High mic sensitivity — quiet sounds captured',
      description: 'Set microphone sensitivity to High. Speak softly at the same distance.',
      expected: 'Quiet speech is captured clearly at High sensitivity.',
    },
    {
      id: 'cam-set-mic-persist',
      title: 'Mic sensitivity setting persists after reboot',
      description: 'Set mic sensitivity, reboot the camera, and confirm the setting is retained.',
      expected: 'Microphone sensitivity setting is preserved after reboot.',
    },
  ],
  'cam-set-speaker-volume': [
    {
      id: 'cam-set-spk-low',
      title: 'Low speaker volume — audio quiet at camera',
      description: 'Set speaker volume to low. Initiate two-way audio and speak from the app.',
      expected: 'Audio at the camera speaker is noticeably quiet at low volume setting.',
    },
    {
      id: 'cam-set-spk-high',
      title: 'High speaker volume — audio louder at camera',
      description: 'Set speaker volume to high. Speak from the app and evaluate volume at camera.',
      expected: 'Audio at the camera speaker is clearly louder at high volume setting.',
    },
    {
      id: 'cam-set-spk-persist',
      title: 'Speaker volume setting persists after reboot',
      description: 'Set speaker volume, reboot the camera, and confirm the setting.',
      expected: 'Speaker volume setting is preserved after reboot.',
    },
  ],
  'cam-set-notif-cooldown': [
    {
      id: 'cam-set-cooldown-active',
      title: 'Notification cooldown suppresses repeat alerts',
      description: 'Set notification cooldown to 5 minutes. Trigger two motion events within 2 minutes.',
      expected: 'Only one notification is received during the cooldown window.',
    },
    {
      id: 'cam-set-cooldown-expired',
      title: 'Notification sent after cooldown expires',
      description: 'Trigger a motion event, wait for cooldown to expire, trigger another event.',
      expected: 'Second notification is received after the cooldown period ends.',
    },
    {
      id: 'cam-set-cooldown-persist',
      title: 'Cooldown setting persists after reboot',
      description: 'Set cooldown value, reboot, verify the setting remains.',
      expected: 'Notification cooldown setting is preserved after reboot.',
    },
  ],
  'cam-set-zone-schedule': [
    {
      id: 'cam-set-zoneschedule-active',
      title: 'Activity zone active during scheduled time',
      description: 'Configure an activity zone schedule for the current time. Trigger motion within the zone.',
      expected: 'Motion event is triggered within the scheduled window.',
    },
    {
      id: 'cam-set-zoneschedule-inactive',
      title: 'Activity zone inactive outside scheduled time',
      description: 'Set schedule to exclude current time. Trigger motion within the zone.',
      expected: 'No motion event is triggered outside the scheduled window.',
    },
    {
      id: 'cam-set-zoneschedule-persist',
      title: 'Zone schedule persists after reboot',
      description: 'Set a zone schedule, reboot, and verify the setting.',
      expected: 'Activity zone schedule is preserved after reboot.',
    },
  ],
  'cam-set-privacy-schedule': [
    {
      id: 'cam-set-privacysched-on',
      title: 'Privacy mode activates at scheduled time',
      description: 'Set privacy mode schedule to activate at the current time.',
      expected: 'Camera enters privacy mode at the scheduled start time; live view is blocked.',
    },
    {
      id: 'cam-set-privacysched-off',
      title: 'Privacy mode deactivates at scheduled end',
      description: 'Allow the privacy schedule end time to pass.',
      expected: 'Camera exits privacy mode at the scheduled end time; live view resumes.',
    },
    {
      id: 'cam-set-privacysched-persist',
      title: 'Privacy schedule persists after reboot',
      description: 'Set privacy mode schedule, reboot, verify the setting.',
      expected: 'Privacy mode schedule is preserved after reboot.',
    },
  ],
  'cam-set-led-toggle': [
    {
      id: 'cam-set-led-off',
      title: 'LED status light disabled via app',
      description: 'Toggle the LED status light Off in camera settings. Observe the LED.',
      expected: 'LED no longer illuminates or blinks after being disabled.',
    },
    {
      id: 'cam-set-led-on',
      title: 'LED status light enabled via app',
      description: 'Toggle the LED status light On in camera settings. Observe the LED.',
      expected: 'LED illuminates or blinks to indicate camera status after being enabled.',
    },
    {
      id: 'cam-set-led-persist',
      title: 'LED toggle setting persists after reboot',
      description: 'Set LED toggle, reboot the camera, and verify the setting.',
      expected: 'LED toggle setting is preserved after reboot.',
    },
  ],
  'cam-set-autotrack': [
    {
      id: 'cam-set-autotrack-follow',
      title: 'Auto-tracking follows subject across FOV',
      description: 'Enable auto-tracking in camera settings. Walk across the camera field of view.',
      expected: 'Camera pan/tilt follows the moving subject across the frame.',
    },
    {
      id: 'cam-set-autotrack-return',
      title: 'Camera returns to home when subject leaves frame',
      description: 'With auto-tracking enabled, walk into frame then exit the camera FOV.',
      expected: 'Camera returns to the home position after the subject leaves the frame.',
    },
    {
      id: 'cam-set-autotrack-disable',
      title: 'Disable auto-tracking stops following',
      description: 'Disable auto-tracking. Walk across the camera FOV.',
      expected: 'Camera does not follow the subject; stays in the current position.',
    },
  ],
  'cam-set-spotlight-settings': [
    {
      id: 'cam-set-spotlight-motion-trigger',
      title: 'Spotlight activates on motion trigger',
      description: 'Set spotlight trigger to "motion only". Trigger motion detection in dark conditions.',
      expected: 'Spotlight activates when motion is detected.',
    },
    {
      id: 'cam-set-spotlight-brightness',
      title: 'Spotlight brightness low/high changes visible output',
      description: 'Set spotlight brightness to low, then high. Compare light output.',
      expected: 'Spotlight brightness is visibly different between low and high settings.',
    },
    {
      id: 'cam-set-spotlight-schedule',
      title: 'Spotlight only activates during scheduled hours',
      description: 'Set a spotlight schedule that excludes the current time. Trigger motion.',
      expected: 'Spotlight does not activate for motion events outside the scheduled hours.',
    },
  ],
  'cam-set-floodlight-settings': [
    {
      id: 'cam-set-floodlight-motion-trigger',
      title: 'Floodlight activates on motion trigger',
      description: 'Set floodlight trigger to "motion only". Trigger motion in dark conditions.',
      expected: 'Floodlight activates when motion is detected.',
    },
    {
      id: 'cam-set-floodlight-brightness',
      title: 'Floodlight brightness levels change output',
      description: 'Adjust floodlight brightness from low to high. Compare light output.',
      expected: 'Floodlight output is visibly brighter at higher brightness settings.',
    },
    {
      id: 'cam-set-floodlight-schedule',
      title: 'Floodlight schedule restricts activation window',
      description: 'Set a floodlight schedule excluding the current time. Trigger motion.',
      expected: 'Floodlight does not activate for motion events outside the scheduled window.',
    },
  ],

  // ─── SENSOR SETTINGS ───────────────────────────────────────────────────────
  'sen-set-entry-delay': [
    {
      id: 'sen-set-entry-delay-countdown',
      title: 'Entry delay countdown shown after sensor trigger',
      description: 'Set entry delay to 30 seconds on an entry sensor. Arm system. Open the entry door.',
      expected: 'App shows a 30-second entry delay countdown before alarm activates.',
    },
    {
      id: 'sen-set-entry-delay-disarm',
      title: 'Disarm within entry delay prevents alarm',
      description: 'Trigger entry sensor with delay active. Disarm the system before countdown expires.',
      expected: 'No alarm is triggered when system is disarmed within the entry delay window.',
    },
    {
      id: 'sen-set-entry-delay-expire',
      title: 'Alarm triggers when entry delay expires',
      description: 'Trigger entry sensor with delay active. Allow countdown to expire without disarming.',
      expected: 'Alarm activates after the entry delay expires.',
    },
  ],
  'sen-set-exit-delay': [
    {
      id: 'sen-set-exit-delay-countdown',
      title: 'Exit delay countdown shown after arm command',
      description: 'Set exit delay to 30 seconds. Arm the system from app or keypad.',
      expected: 'App shows a 30-second exit delay countdown before system fully arms.',
    },
    {
      id: 'sen-set-exit-delay-door-open',
      title: 'Opening entry door during exit delay does not alarm',
      description: 'Arm system with exit delay. Open the entry door during the delay window.',
      expected: 'No alarm is triggered when entry door is opened during the exit delay period.',
    },
    {
      id: 'sen-set-exit-delay-arm',
      title: 'System arms fully after exit delay expires',
      description: 'Arm system with exit delay. Allow countdown to expire.',
      expected: 'System fully arms after the exit delay expires and entry door triggers would cause alarm.',
    },
  ],
  'sen-set-chime-type': [
    {
      id: 'sen-set-chime-change',
      title: 'Change chime type — new chime plays on trigger',
      description: 'Change the chime type in app settings. Trigger the sensor.',
      expected: 'The newly selected chime type plays when the sensor is triggered.',
    },
    {
      id: 'sen-set-chime-each-type',
      title: 'Test each available chime type',
      description: 'Cycle through all available chime types in settings. Trigger sensor after each change.',
      expected: 'Each chime type produces a distinct sound when triggered.',
    },
    {
      id: 'sen-set-chime-persist',
      title: 'Selected chime type persists after hub reboot',
      description: 'Select a chime type, reboot the hub, trigger the sensor.',
      expected: 'The selected chime type is retained and plays correctly after hub reboot.',
    },
  ],
  'sen-set-chime-volume': [
    {
      id: 'sen-set-chime-vol-low',
      title: 'Chime volume Low — quiet chime on trigger',
      description: 'Set chime volume to Low. Trigger the sensor.',
      expected: 'Chime plays at a noticeably quiet volume.',
    },
    {
      id: 'sen-set-chime-vol-high',
      title: 'Chime volume High — loud chime on trigger',
      description: 'Set chime volume to High. Trigger the sensor.',
      expected: 'Chime plays at a clearly louder volume compared to Low setting.',
    },
    {
      id: 'sen-set-chime-vol-persist',
      title: 'Chime volume persists after hub reboot',
      description: 'Set chime volume, reboot hub, trigger sensor.',
      expected: 'Chime volume setting is preserved after reboot.',
    },
  ],
  'sen-set-motion-sensitivity': [
    {
      id: 'sen-set-motion-sens-low',
      title: 'Motion sensitivity Low — small movements ignored',
      description: 'Set motion PIR sensitivity to Low. Make small, slow movements at the edge of the detection zone.',
      expected: 'Small or distant movements do not trigger the sensor at Low sensitivity.',
    },
    {
      id: 'sen-set-motion-sens-high',
      title: 'Motion sensitivity High — small movements detected',
      description: 'Set sensitivity to High. Make the same small movements.',
      expected: 'Small movements trigger the sensor at High sensitivity.',
    },
    {
      id: 'sen-set-motion-sens-persist',
      title: 'Motion sensitivity setting persists after reboot',
      description: 'Set sensitivity level, reboot hub, verify setting.',
      expected: 'Motion sensitivity setting is preserved after hub reboot.',
    },
  ],
  'sen-set-supervision': [
    {
      id: 'sen-set-supervision-interval',
      title: 'Supervision check-in received at configured interval',
      description: 'Set supervision interval. Wait for the interval to pass.',
      expected: 'Hub receives a supervision signal from the sensor at the configured interval.',
    },
    {
      id: 'sen-set-supervision-alert',
      title: 'Supervision failure alert when sensor goes silent',
      description: 'Set supervision interval. Remove sensor battery or block RF signal beyond the interval.',
      expected: 'Hub/app generates a supervision failure alert when check-in is missed.',
    },
    {
      id: 'sen-set-supervision-persist',
      title: 'Supervision interval setting persists after reboot',
      description: 'Set supervision interval, reboot hub, verify setting.',
      expected: 'Supervision interval setting is preserved after hub reboot.',
    },
  ],
  'sen-set-pet-immunity': [
    {
      id: 'sen-set-petimmunity-low',
      title: 'Low pet immunity threshold — small pet may trigger',
      description: 'Set pet immunity level to Low. Have a small pet move through the detection zone.',
      expected: 'Small pet triggers the sensor at the Low immunity setting.',
    },
    {
      id: 'sen-set-petimmunity-high',
      title: 'High pet immunity threshold — small pet ignored',
      description: 'Set pet immunity level to High. Have a small pet move through the detection zone.',
      expected: 'Small pet does not trigger the sensor at High immunity level.',
    },
    {
      id: 'sen-set-petimmunity-human',
      title: 'Human still triggers sensor at high pet immunity',
      description: 'Set pet immunity to High. Walk through the detection zone.',
      expected: 'Human movement still triggers the sensor regardless of pet immunity level.',
    },
  ],

  // ─── HUB SETTINGS ──────────────────────────────────────────────────────────
  'hub-set-entry-delay': [
    {
      id: 'hub-set-entry-delay-countdown',
      title: 'Entry delay countdown shown in app after trigger',
      description: 'Set hub entry delay to 30 seconds. Arm system. Trigger an entry sensor.',
      expected: 'App shows a 30-second countdown before alarm activates.',
    },
    {
      id: 'hub-set-entry-delay-disarm',
      title: 'Disarm within entry delay prevents alarm',
      description: 'Trigger entry sensor with hub delay active. Disarm before countdown expires.',
      expected: 'No alarm triggers when disarmed within the entry delay window.',
    },
    {
      id: 'hub-set-entry-delay-expire',
      title: 'Alarm triggers after entry delay expires',
      description: 'Trigger entry sensor with delay. Let countdown expire without disarming.',
      expected: 'Alarm activates after the full entry delay elapses.',
    },
  ],
  'hub-set-exit-delay': [
    {
      id: 'hub-set-exit-delay-countdown',
      title: 'Exit delay countdown visible after arm command',
      description: 'Set hub exit delay to 30 seconds. Arm system from app.',
      expected: 'App shows 30-second exit delay countdown before system fully arms.',
    },
    {
      id: 'hub-set-exit-delay-no-alarm',
      title: 'Entry during exit delay does not alarm',
      description: 'Arm system with exit delay. Open entry door during delay window.',
      expected: 'No alarm triggered while opening entry door within exit delay period.',
    },
    {
      id: 'hub-set-exit-delay-persist',
      title: 'Exit delay setting persists after hub reboot',
      description: 'Set exit delay, reboot hub, verify setting.',
      expected: 'Exit delay setting is preserved after reboot.',
    },
  ],
  'hub-set-alarm-duration': [
    {
      id: 'hub-set-alarm-dur-short',
      title: 'Alarm stops after configured duration',
      description: 'Set alarm duration to 60 seconds. Trigger alarm. Allow it to run without cancellation.',
      expected: 'Alarm siren and alerts stop automatically after 60 seconds.',
    },
    {
      id: 'hub-set-alarm-dur-long',
      title: 'Longer alarm duration extends siren',
      description: 'Set alarm duration to 5 minutes. Trigger alarm. Allow it to run.',
      expected: 'Siren continues for 5 minutes before stopping automatically.',
    },
    {
      id: 'hub-set-alarm-dur-persist',
      title: 'Alarm duration setting persists after hub reboot',
      description: 'Set alarm duration, reboot hub, verify setting.',
      expected: 'Alarm duration setting is preserved after reboot.',
    },
  ],
  'hub-set-siren-volume': [
    {
      id: 'hub-set-siren-vol-low',
      title: 'Siren volume Low — quieter alarm',
      description: 'Set siren volume to Low. Trigger alarm and measure audibility.',
      expected: 'Siren is clearly quieter than the default/high volume setting.',
    },
    {
      id: 'hub-set-siren-vol-high',
      title: 'Siren volume High — loud alarm',
      description: 'Set siren volume to High. Trigger alarm and measure audibility.',
      expected: 'Siren is at maximum volume; clearly audible at 10+ feet.',
    },
    {
      id: 'hub-set-siren-vol-persist',
      title: 'Siren volume setting persists after hub reboot',
      description: 'Set siren volume, reboot hub, verify setting.',
      expected: 'Siren volume setting is preserved after reboot.',
    },
  ],
  'hub-set-dialer-delay': [
    {
      id: 'hub-set-dialer-delay-active',
      title: 'Dialer delay postpones monitoring center contact',
      description: 'Set dialer delay to 30 seconds. Trigger alarm. Cancel within the delay window.',
      expected: 'Monitoring center is not contacted when alarm is cancelled within the dialer delay.',
    },
    {
      id: 'hub-set-dialer-delay-expire',
      title: 'Monitoring center contacted after dialer delay expires',
      description: 'Trigger alarm. Allow dialer delay to expire without cancelling.',
      expected: 'Monitoring center receives alarm signal after the dialer delay elapses.',
    },
    {
      id: 'hub-set-dialer-delay-persist',
      title: 'Dialer delay setting persists after hub reboot',
      description: 'Set dialer delay, reboot hub, verify setting.',
      expected: 'Dialer delay setting is preserved after reboot.',
    },
  ],
  'hub-set-ac-loss-notif': [
    {
      id: 'hub-set-acloss-delay',
      title: 'AC loss notification delayed by configured interval',
      description: 'Set AC power loss notification delay to 30 minutes. Disconnect AC power from hub.',
      expected: 'No notification is sent for at least 30 minutes after AC power loss.',
    },
    {
      id: 'hub-set-acloss-notif-sent',
      title: 'AC loss notification sent after delay expires',
      description: 'Keep AC disconnected beyond the configured delay.',
      expected: 'AC loss notification is sent to the app after the delay period.',
    },
    {
      id: 'hub-set-acloss-restore-no-notif',
      title: 'No alert if AC restored within delay',
      description: 'Disconnect AC power, then reconnect before the delay expires.',
      expected: 'No AC loss notification is sent when power is restored within the delay window.',
    },
  ],
  'hub-set-low-battery': [
    {
      id: 'hub-set-lowbatt-alert',
      title: 'Low battery alert triggered at configured threshold',
      description: 'Set low battery threshold to 30%. Allow hub battery to deplete to that level (or simulate).',
      expected: 'Low battery alert is sent to the app when battery reaches the configured threshold.',
    },
    {
      id: 'hub-set-lowbatt-above-threshold',
      title: 'No low battery alert above configured threshold',
      description: 'Verify no alert is sent when battery is above the threshold.',
      expected: 'No low battery notification is received while battery remains above the threshold.',
    },
    {
      id: 'hub-set-lowbatt-persist',
      title: 'Low battery threshold setting persists after hub reboot',
      description: 'Set low battery threshold, reboot hub, verify setting.',
      expected: 'Low battery threshold setting is preserved after reboot.',
    },
  ],

  // ─── APP SETTINGS ──────────────────────────────────────────────────────────
  'app-set-notif-sound': [
    {
      id: 'app-set-notif-sound-change',
      title: 'Change notification sound — new sound plays on event',
      description: 'Change notification sound in app settings. Trigger an event.',
      expected: 'The newly selected notification sound plays when an event notification arrives.',
    },
    {
      id: 'app-set-notif-sound-each',
      title: 'Preview each available notification sound',
      description: 'Select each available notification sound and use any preview function.',
      expected: 'Each sound plays a distinct tone when previewed.',
    },
    {
      id: 'app-set-notif-sound-persist',
      title: 'Notification sound persists after app restart',
      description: 'Set notification sound, close and reopen app, verify setting.',
      expected: 'Selected notification sound is retained after app restart.',
    },
  ],
  'app-set-auto-arm': [
    {
      id: 'app-set-autoarm-schedule',
      title: 'Auto-arm activates at scheduled time',
      description: 'Set auto-arm schedule for a time within the next 10 minutes. Wait for the scheduled time.',
      expected: 'System arms automatically at the configured time.',
    },
    {
      id: 'app-set-autoarm-outside-schedule',
      title: 'Auto-arm does not trigger outside scheduled time',
      description: 'Set auto-arm schedule for a future time. Verify system does not arm at other times.',
      expected: 'System does not auto-arm outside the configured schedule window.',
    },
    {
      id: 'app-set-autoarm-persist',
      title: 'Auto-arm schedule persists after app restart',
      description: 'Set auto-arm schedule, restart app, verify setting.',
      expected: 'Auto-arm schedule is preserved after app restart.',
    },
  ],
  'app-set-disarm-timeout': [
    {
      id: 'app-set-disarm-timeout-active',
      title: 'Disarm timeout re-arms system after configured period',
      description: 'Set disarm timeout to 5 minutes. Disarm the system. Wait for the timeout.',
      expected: 'System automatically re-arms after the configured disarm timeout period.',
    },
    {
      id: 'app-set-disarm-timeout-cancel',
      title: 'Re-arm cancelled if manual arm/disarm occurs during timeout',
      description: 'Disarm system with timeout active. Manually arm then disarm before timeout.',
      expected: 'Timeout clock resets or is cancelled by manual arm/disarm interaction.',
    },
    {
      id: 'app-set-disarm-timeout-persist',
      title: 'Disarm timeout setting persists after app restart',
      description: 'Set disarm timeout, restart app, verify setting.',
      expected: 'Disarm timeout setting is retained after app restart.',
    },
  ],
  'app-set-video-quality': [
    {
      id: 'app-set-vidqual-low',
      title: 'Low video quality reduces bandwidth in live view',
      description: 'Set video quality preference to Low. Open live view and monitor bandwidth.',
      expected: 'Bandwidth usage is lower and image quality is reduced compared to High setting.',
    },
    {
      id: 'app-set-vidqual-high',
      title: 'High video quality improves live view clarity',
      description: 'Set video quality preference to High. Open live view and compare image quality.',
      expected: 'Image quality is noticeably sharper with higher bandwidth usage.',
    },
    {
      id: 'app-set-vidqual-persist',
      title: 'Video quality preference persists after app restart',
      description: 'Set video quality, restart app, verify setting.',
      expected: 'Video quality preference is preserved after app restart.',
    },
  ],
  'app-set-download-quality': [
    {
      id: 'app-set-dlqual-low',
      title: 'Low download quality produces smaller clip file',
      description: 'Set download quality to Low. Download an event clip. Check file size.',
      expected: 'Downloaded clip file is smaller than a clip downloaded at High quality.',
    },
    {
      id: 'app-set-dlqual-high',
      title: 'High download quality produces larger higher-quality clip',
      description: 'Set download quality to High. Download an event clip. Check file size and quality.',
      expected: 'Downloaded clip is larger and of higher visual quality than Low setting.',
    },
    {
      id: 'app-set-dlqual-persist',
      title: 'Download quality setting persists after app restart',
      description: 'Set download quality, restart app, verify setting.',
      expected: 'Download quality setting is retained after app restart.',
    },
  ],

  // ─── TOUCHPAD SETTINGS ─────────────────────────────────────────────────────
  'tp-set-brightness': [
    {
      id: 'tp-set-brightness-low',
      title: 'Low display brightness — dim screen',
      description: 'Set touchpad display brightness to the lowest level in app settings.',
      expected: 'Touchpad display is noticeably dimmer at the lowest brightness setting.',
    },
    {
      id: 'tp-set-brightness-high',
      title: 'High display brightness — bright screen',
      description: 'Set touchpad display brightness to the highest level.',
      expected: 'Touchpad display is at maximum brightness.',
    },
    {
      id: 'tp-set-brightness-persist',
      title: 'Display brightness persists after reboot',
      description: 'Set brightness level, reboot touchpad, verify the setting.',
      expected: 'Display brightness setting is retained after reboot.',
    },
  ],
  'tp-set-volume': [
    {
      id: 'tp-set-volume-low',
      title: 'Low volume level — quiet chime/beeps',
      description: 'Set touchpad volume to Low. Arm or trigger an event to hear the beep/chime.',
      expected: 'Touchpad audio is noticeably quieter at the Low volume setting.',
    },
    {
      id: 'tp-set-volume-high',
      title: 'High volume level — loud chime/beeps',
      description: 'Set touchpad volume to High. Arm or trigger an event.',
      expected: 'Touchpad audio is clearly louder at the High volume setting.',
    },
    {
      id: 'tp-set-volume-persist',
      title: 'Volume setting persists after reboot',
      description: 'Set volume level, reboot touchpad, verify setting.',
      expected: 'Volume setting is preserved after reboot.',
    },
  ],
  'tp-set-button-tone': [
    {
      id: 'tp-set-btntone-on',
      title: 'Button tone enabled — beep on keypress',
      description: 'Enable button tone in touchpad settings. Press any key on the touchpad.',
      expected: 'A brief tone sounds with each key press.',
    },
    {
      id: 'tp-set-btntone-off',
      title: 'Button tone disabled — silent keypress',
      description: 'Disable button tone. Press any key on the touchpad.',
      expected: 'No tone sounds when keys are pressed.',
    },
    {
      id: 'tp-set-btntone-persist',
      title: 'Button tone setting persists after reboot',
      description: 'Set button tone, reboot touchpad, verify setting.',
      expected: 'Button tone setting is preserved after reboot.',
    },
  ],
};
