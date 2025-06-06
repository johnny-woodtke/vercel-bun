const baseUrl =
  `http://${process.env.AWS_LAMBDA_RUNTIME_API}/2018-06-01` as const;

const nextInvocationUrl = `${baseUrl}/runtime/invocation/next` as const;

function invocationResponseUrl<TAwsRequestId extends string>(
  awsRequestId: TAwsRequestId
) {
  return `${baseUrl}/runtime/invocation/${awsRequestId}/response` as const;
}

const initializationErrorUrl = `${baseUrl}/runtime/init/error` as const;

function invocationErrorUrl<TAwsRequestId extends string>(
  awsRequestId: TAwsRequestId
) {
  return `${baseUrl}/runtime/invocation/${awsRequestId}/error` as const;
}

const lambdaRuntimeAwsRequestIdHeader =
  "Lambda-Runtime-Aws-Request-Id" as const;

type NextInvocationEvent = {
  body: string;
};

type ErrorInvocationBody = {
  errorMessage: string;
  errorType: string;
  stackTrace: string[];
};

/**
 * Implements the AWS Lambda Runtime API.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html
 * @see https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html
 */
export const Runtime = {
  async getNextInvocation(): Promise<{
    event: NextInvocationEvent;
    awsRequestId: string;
  }> {
    const res = await fetch(nextInvocationUrl, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error(
        `Failed to get next invocation: ${res.status} ${res.statusText}`
      );
    }

    const event = await res.json();

    console.log("received event");
    console.log(JSON.stringify(event, null, 2));

    const awsRequestId = res.headers.get(lambdaRuntimeAwsRequestIdHeader);
    if (!awsRequestId) {
      throw new Error("No AWS request ID found");
    }

    return { event, awsRequestId };
  },

  async postInvocationResponse<TAwsRequestId extends string>(
    awsRequestId: TAwsRequestId,
    body: unknown
  ): Promise<void> {
    const res = await fetch(invocationResponseUrl(awsRequestId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to post invocation response: ${res.status} ${res.statusText}`
      );
    }
  },

  async postInitializationError(error: ErrorInvocationBody): Promise<void> {
    const res = await fetch(initializationErrorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(error),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to post initialization error: ${res.status} ${res.statusText}`
      );
    }
  },

  async postInvocationError<TAwsRequestId extends string>(
    awsRequestId: TAwsRequestId,
    error: ErrorInvocationBody
  ): Promise<void> {
    const res = await fetch(invocationErrorUrl(awsRequestId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(error),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to post invocation error: ${res.status} ${res.statusText}`
      );
    }
  },
} as const;
