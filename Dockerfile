FROM denoland/deno:alpine-1.34.0

# Create a volume to put the repo in with the correct permissions
RUN mkdir -p /app/repo && chown -R deno:deno /app/repo \
  && apk add --no-cache git openssh

EXPOSE 8000
WORKDIR /app
USER deno

COPY --chown=deno:deno [".", "/app/"]

RUN deno cache source/server.ts

CMD ["task", "serve", "--sync"]