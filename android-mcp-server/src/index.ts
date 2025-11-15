import { MCPServer, Tool } from "@modelcontextprotocol/sdk";
import Adb from "@u4/adbkit";
import { DeviceClient } from "@u4/adbkit";

const adb = Adb.createClient();

const listDevices: Tool = {
  name: "list_devices",
  description: "Lists all connected Android devices.",
  run: async () => {
    try {
      const devices = await adb.listDevices();
      return devices.map((device) => device.id);
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "An unknown error occurred" };
    }
  },
};

const getDeviceModel: Tool = {
  name: "get_device_model",
  description: "Gets the model of a specific device.",
  arguments: {
    deviceId: {
      type: "string",
      description: "The ID of the device.",
      required: true,
    },
  },
  run: async ({ deviceId }) => {
    try {
      const device: DeviceClient = adb.getDevice(deviceId);
      const properties = await device.getProperties();
      return properties["ro.product.model"];
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "An unknown error occurred" };
    }
  },
};

const getDeviceIpAddress: Tool = {
    name: "get_device_ip_address",
    description: "Gets the IP address of a specific device.",
    arguments: {
        deviceId: {
            type: "string",
            description: "The ID of the device.",
            required: true,
        },
    },
    run: async ({ deviceId }) => {
        try {
            const device: DeviceClient = adb.getDevice(deviceId);
            const properties = await device.getProperties();
            return properties["dhcp.wlan0.ipaddress"];
        } catch (error) {
            if (error instanceof Error) {
                return { error: error.message };
            }
            return { error: "An unknown error occurred" };
        }
    },
};


const server = new MCPServer({
  tools: [listDevices, getDeviceModel, getDeviceIpAddress],
});

server.listen({ port: 8080 });
