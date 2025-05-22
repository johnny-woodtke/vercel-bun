// Bun runtime handler for Vercel serverless functions
import { join } from "path";

// The handler that will be executed by Bun
async function main() {
  try {
    // Get handler and request from AWS Lambda environment
    const { AWS_LAMBDA_FUNCTION_NAME, LAMBDA_TASK_ROOT, _HANDLER } =
      process.env;

    // Log startup info
    console.log(`Starting Bun runtime for ${AWS_LAMBDA_FUNCTION_NAME}`);
    console.log(`Bun version: ${Bun.version}`);
    console.log(`Handler: ${_HANDLER}`);

    // Import user handler
    if (!_HANDLER) {
      throw new Error("No handler specified");
    }

    // Import the specified handler file
    const handlerPath = join(LAMBDA_TASK_ROOT || "", _HANDLER);
    console.log(`Loading handler from ${handlerPath}`);

    // Use dynamic import to load the handler
    const userModule = await import(handlerPath);

    // Start the AWS Lambda runtime
    startLambdaRuntime(userModule);
  } catch (error) {
    console.error("Error starting Bun runtime:", error);
    process.exit(1);
  }
}

// Function to start the Lambda runtime and process requests
async function startLambdaRuntime(userModule: any) {
  const { AWS_LAMBDA_RUNTIME_API } = process.env;

  if (!AWS_LAMBDA_RUNTIME_API) {
    throw new Error("AWS_LAMBDA_RUNTIME_API environment variable is not set");
  }

  const runtimeApiEndpoint = `http://${AWS_LAMBDA_RUNTIME_API}`;

  // Process Lambda invocations in a loop
  while (true) {
    try {
      // Get next invocation
      const invocationResponse = await fetch(
        `${runtimeApiEndpoint}/2018-06-01/runtime/invocation/next`
      );

      const requestId = invocationResponse.headers.get(
        "Lambda-Runtime-Aws-Request-Id"
      );
      const context = {
        requestId,
        deadline: invocationResponse.headers.get("Lambda-Runtime-Deadline-Ms"),
        invokedFunctionArn: invocationResponse.headers.get(
          "Lambda-Runtime-Invoked-Function-Arn"
        ),
        traceId: process.env._X_AMZN_TRACE_ID,
      };

      console.log(`Processing request ${requestId}`);

      // Get the event data
      const event = await invocationResponse.json();

      // Call the user handler
      let result;
      try {
        // Determine whether we have a GET, POST, etc. handler
        const { method } = event as { method: string };
        if (method && userModule[method]) {
          result = await userModule[method](event, context);
        } else {
          // Try to use handle, handler or default export
          const handler =
            userModule.handle || userModule.handler || userModule.default;
          if (typeof handler === "function") {
            result = await handler(event, context);
          } else {
            throw new Error("No valid handler function found in the module");
          }
        }

        // Send the successful response
        await fetch(
          `${runtimeApiEndpoint}/2018-06-01/runtime/invocation/${requestId}/response`,
          {
            method: "POST",
            body: JSON.stringify(result),
          }
        );
      } catch (handlerError) {
        console.error("Handler error:", handlerError);

        // Send the error response
        await fetch(
          `${runtimeApiEndpoint}/2018-06-01/runtime/invocation/${requestId}/error`,
          {
            method: "POST",
            body: JSON.stringify({
              errorMessage: (handlerError as Error).message,
              errorType: (handlerError as Error).name,
              stackTrace: (handlerError as Error).stack?.split("\n"),
            }),
          }
        );
      }
    } catch (runtimeError) {
      console.error("Runtime error:", runtimeError);

      // Wait a bit before retrying to avoid hot looping
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Start the runtime
main().catch((error) => {
  console.error("Fatal runtime error:", error);
  process.exit(1);
});
