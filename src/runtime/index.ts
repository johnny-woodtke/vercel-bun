import { Handler } from "./Handler";
import { Runtime } from "./Runtime";
import type { ErrorInvocationBody, Handler as HandlerType } from "./types";

/**
 * Perform initialization.
 * 1. Initialize the handler function.
 *
 * Process events in a loop.
 * 1. Get an event.
 * 2. Invoke the function handler.
 * 3. Hande the response.
 * 4. Hande errors.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html
 */
async function main() {
  // Perform initialization
  let handler: HandlerType;
  try {
    // Initialize the handler function
    handler = await Handler.get();
  } catch (e) {
    // Cast the error to an Error
    const error = e as Error;

    // Create the error payload
    const errorPayload: ErrorInvocationBody = {
      errorMessage: error.message,
      errorType: `initialization.error.${error.name}`,
      stackTrace: error.stack?.split("\n") ?? [],
    };

    // Log the error
    console.error(`${errorPayload.errorType}: ${errorPayload.errorMessage}`);

    // Post the error to the runtime API and exit
    await Runtime.postInitializationError(errorPayload);
    throw error;
  }

  // Process events in a loop
  while (true) {
    try {
      // Get the next invocation from the runtime API
      const nextInvocation = await Runtime.getNextInvocation();

      // Run user code and get the response
      const response = await handler(nextInvocation.request);

      // Post the response to the runtime API
      await Runtime.postInvocationResponse(
        nextInvocation.awsRequestId,
        response
      );
    } catch (e) {
      // Cast the error to an Error
      const error = e as Error;

      // Create the error payload
      const errorPayload: ErrorInvocationBody = {
        errorMessage: error.message,
        errorType: `process.error.${error.name}`,
        stackTrace: error.stack?.split("\n") ?? [],
      };

      // Log the error
      console.error(`${errorPayload.errorType}: ${errorPayload.errorMessage}`);

      // Get the AWS request ID
      const awsRequestId = Runtime.getAwsRequestId();

      // Post the error to the runtime API
      await (awsRequestId
        ? Runtime.postInvocationError(awsRequestId, errorPayload)
        : Runtime.postInitializationError(errorPayload));
    }
  }
}

// Run the main function
main().catch(() => process.exit(1));
