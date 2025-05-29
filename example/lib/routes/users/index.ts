import { Elysia, t } from "elysia";

export const usersRoutes = new Elysia({ prefix: "/users" })

  .options(
    "/",
    ({ set }) => {
      set.headers["access-control-allow-origin"] = "*";
      set.headers["access-control-allow-methods"] =
        "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS";
      set.headers["access-control-allow-headers"] =
        "Content-Type, Authorization";
      set.headers["access-control-max-age"] = "86400";
    },
    {
      response: t.Void(),
    }
  )

  .post(
    "/",
    async ({ body }) => {
      return { success: true, data: body };
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
      }),
      response: t.Object({
        success: t.Boolean(),
        data: t.Object({
          name: t.String(),
          email: t.String(),
        }),
      }),
    }
  )

  .options(
    "/:id",
    ({ set, params }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      set.headers["access-control-allow-origin"] = "*";
      set.headers["access-control-allow-methods"] =
        "GET, PUT, PATCH, DELETE, HEAD, OPTIONS";
      set.headers["access-control-allow-headers"] =
        "Content-Type, Authorization";
      set.headers["access-control-max-age"] = "86400";
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Union([
        t.Object({
          error: t.String(),
        }),
        t.Void(),
      ]),
    }
  )

  .get(
    "/:id",
    ({ params, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      return {
        id: userId,
        name: "John Doe",
        email: "john@example.com",
        createdAt: new Date().toISOString(),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Union([
        t.Object({
          id: t.Number(),
          name: t.String(),
          email: t.String(),
          createdAt: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )

  .put(
    "/:id",
    ({ params, body, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      return {
        id: userId,
        name: body.name,
        email: body.email,
        updatedAt: new Date().toISOString(),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String(),
        email: t.String(),
      }),
      response: t.Union([
        t.Object({
          id: t.Number(),
          name: t.String(),
          email: t.String(),
          updatedAt: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )

  .patch(
    "/:id",
    ({ params, body, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      // Simulate getting existing user data
      const existingUser = {
        id: userId,
        name: "John Doe",
        email: "john@example.com",
      };

      // Only update provided fields
      const updatedUser = {
        id: userId,
        name: body.name ?? existingUser.name,
        email: body.email ?? existingUser.email,
        updatedAt: new Date().toISOString(),
      };

      return updatedUser;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        email: t.Optional(t.String()),
      }),
      response: t.Union([
        t.Object({
          id: t.Number(),
          name: t.String(),
          email: t.String(),
          updatedAt: t.String(),
        }),
        t.Object({
          error: t.String(),
        }),
      ]),
    }
  )

  .delete(
    "/:id",
    ({ params, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 400;
        return { error: "Invalid user ID" };
      }

      set.status = 204;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Union([
        t.Object({
          error: t.String(),
        }),
        t.Void(),
      ]),
    }
  )

  .head(
    "/:id",
    ({ params, set }) => {
      const userId = parseInt(params.id);

      if (isNaN(userId)) {
        set.status = 404;
        return;
      }

      set.headers["x-user-exists"] = "true";
      set.headers["content-type"] = "application/json";
      set.headers["content-length"] = "100";
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Void(),
    }
  );
