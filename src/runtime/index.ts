import { getHandler } from "./getHandler";
import { Runtime } from "./Runtime";

async function processEvents() {
  while (true) {
    try {
      // Get the next event
      const { request, awsRequestId } = await Runtime.getNextInvocation();

      console.log("transformed request");
      console.dir(request, { depth: null });

      try {
        // Get the handler
        const handler = await getHandler();

        // Run user code and get the response
        const response = await handler(request);

        console.log("handler response");
        console.dir(response, { depth: null });

        throw new Error("test");

        // Parse the response
        await Runtime.postInvocationResponse(awsRequestId, response);
      } catch (e: unknown) {
        const error = e as Error;

        // Log the error
        console.error("User code error:", error.message);

        // Invoke the error
        await Runtime.postInvocationError(awsRequestId, {
          errorMessage: error.message,
          errorType: error.name,
          stackTrace: error.stack?.split("\n") ?? [],
        });
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
