import { Elysia, t } from "elysia";

export const paramsRoutes = new Elysia({ prefix: "/params" })

  .post(
    "/body",
    ({ body }) => ({
      receivedBody: body,
    }),
    {
      body: t.Object({
        name: t.String(),
      }),
      response: {
        200: t.Object({
          receivedBody: t.Object({
            name: t.String(),
          }),
        }),
      },
    }
  )

  .post(
    "/query",
    ({ query }) => ({
      receivedQuery: query,
    }),
    {
      query: t.Object({
        name: t.String(),
      }),
      response: {
        200: t.Object({
          receivedQuery: t.Object({
            name: t.String(),
          }),
        }),
      },
    }
  )

  .post(
    "/path/:id",
    ({ params }) => ({
      receivedPath: params,
    }),
    {
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: t.Object({
          receivedPath: t.Object({
            id: t.String(),
          }),
        }),
      },
    }
  );
