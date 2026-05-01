import { Client } from "@gradio/client";

async function run() {
  try {
    const client = await Client.connect("Nymbo/Virtual-Try-On");
    const appInfo = await client.view_api();
    console.log(JSON.stringify(appInfo, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
