FROM denoland/deno:alpine-1.42.1

# Create a volume to put the repo in with the correct permissions
RUN mkdir -p /app/repo && chown -R deno:deno /app/repo \
  && apk add --no-cache git openssh

EXPOSE 8000
WORKDIR /app
USER deno

COPY --chown=deno:deno [".", "/app/"]

RUN deno cache source/server.ts \
  && git config --global --add safe.directory /app/repo

CMD ["task", "serve", "--sync"]
