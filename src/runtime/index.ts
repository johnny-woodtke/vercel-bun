import { getHandler } from "./getHandler";
import { invokeError, invokeResponse, nextInvocation } from "./lambda";
import { fromVercelRequest, toVercelResponse } from "./transforms";
import type {
  Handler,
  VercelRequestPayload,
  VercelResponsePayload,
} from "./types";

async function processEvents() {
  let event: any;
  let awsRequestId: string;

  let handler: Handler;

  let payload: VercelRequestPayload;
  let req: Request;

  let res: Response;

  let vercelRes: VercelResponsePayload;

  while (true) {
    try {
      // Get the next event
      ({ event, awsRequestId } = await nextInvocation());

      try {
        // Get the handler
        handler = await getHandler();

        // Parse the request
        payload = JSON.parse(event.body);
        req = fromVercelRequest(payload);

        // Run user code and send response
        res = await handler(req);

        // Parse the response
        vercelRes = await toVercelResponse(res);
        await invokeResponse(vercelRes, awsRequestId);
      } catch (e: any) {
        // Log the error
        console.error("User code error:", e.message);

        // Invoke the error
        await invokeError(e, awsRequestId);
      }
    } catch (e: any) {
      // Log the error
      console.error("Lambda runtime error:", e.message);

      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

const { _HANDLER, ENTRYPOINT } = process.env;

if (_HANDLER) {
  // Runtime - execute the runtime loop
  processEvents().catch((e) => {
    console.error("processEvents error:", e.message);
    process.exit(1);
  });
} else {
  // Build - import the entrypoint so that it gets cached
  import(ENTRYPOINT!).catch((e) => {
    console.error("Failed to import entrypoint:", e.message);
    process.exit(1);
  });
}
