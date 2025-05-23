import { request as httpRequest } from "node:http";

import { RUNTIME_PATH } from "./constants";

export function httpRequest2Promise<T>(
  url: string,
  options: any = {},
  responseHandler: (res: any) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, options, (res) => {
      responseHandler(res).then(resolve).catch(reject);
    });

    req.on("error", reject);

    if (options.body) req.write(options.body);

    req.end();
  });
}

export function performRequest(path: string, options: any = {}) {
  return httpRequest2Promise<{ status: number; headers: any; body: string }>(
    `http://${process.env.AWS_LAMBDA_RUNTIME_API}/${RUNTIME_PATH}/${path}`,
    options,
    async (res) => {
      let body = "";

      return new Promise((resolve) => {
        res.on("data", (chunk: string) => (body += chunk));

        res.on("end", () => {
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            body,
          });
        });
      });
    }
  );
}
