import { getHandler } from "./getHandler";
import { invokeError, invokeResponse, nextInvocation } from "./lambda";
import { Runtime } from "./Runtime";
import { fromVercelRequest, toVercelResponse } from "./transforms";
import type {
  Handler,
  VercelRequestPayload,
  VercelResponsePayload,
} from "./types";

async function processEvents() {
  while (true) {
    try {
      // Get the next event
      const { event, awsRequestId } = await Runtime.getNextInvocation();

      try {
        // Get the handler
        const handler = await getHandler();

        // Parse the request
        const payload = JSON.parse(event.body);
        const req = fromVercelRequest(payload);

        // Run user code and send response
        const res = await handler(req);

        // Parse the response
        const vercelRes = await toVercelResponse(res);
        await Runtime.postInvocationResponse(awsRequestId, vercelRes);
      } catch (e: any) {
        // Log the error
        console.error("User code error:", e.message);

        // Invoke the error
        await Runtime.postInvocationError(awsRequestId, e);
      }
    } catch (e: any) {
      // Log the error
      console.error("Lambda runtime error:", e.message);

      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

if (process.env._HANDLER) {
  // Runtime - execute the runtime loop
  processEvents().catch((e) => {
    console.error("processEvents error:", e.message);
    process.exit(1);
  });
} else if (process.env.ENTRYPOINT) {
  // Build - import the entrypoint so that it gets cached
  import(process.env.ENTRYPOINT).catch((e) => {
    console.error("Failed to import entrypoint:", e.message);
    process.exit(1);
  });
}
