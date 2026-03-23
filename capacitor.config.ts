import { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.ambrysoft.app",
  appName: "ambrysoft",
  webDir: "out",
  server: {
    url: "https://pos.ambrysoft.com",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
}

export default config