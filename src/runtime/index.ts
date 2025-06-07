import { getHandler } from "./getHandler";
import { Runtime } from "./Runtime";
import type { ErrorInvocationBody } from "./types";

async function processEvents() {
  while (true) {
    try {
      // Get the next event and the handler
      const [{ request, awsRequestId }, handler] = await Promise.all([
        Runtime.getNextInvocation(),
        getHandler(),
      ]);

      // Run user code and get the response
      const response = await handler(request);

      // Parse the response
      await Runtime.postInvocationResponse(awsRequestId, response);
    } catch (e) {
      // Cast the error to an Error
      const error = e as Error;

      // Log the error
      console.error("Something went wrong:", error.message);

      // Get the AWS request ID
      const awsRequestId = Runtime.getAwsRequestId();

      // Create the error payload
      const errorPayload: ErrorInvocationBody = {
        errorMessage: error.message,
        errorType: error.name,
        stackTrace: error.stack?.split("\n") ?? [],
      };

      // Post the error to the runtime API
      await (awsRequestId
        ? Runtime.postInvocationError(awsRequestId, errorPayload)
        : Runtime.postInitializationError(errorPayload));
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
