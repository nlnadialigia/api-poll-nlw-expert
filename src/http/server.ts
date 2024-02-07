import fastify from "fastify";

const app = fastify();

app.get("/", () => {
  return "TESTE INICIAL"
})

app.listen({port: 5000}).then(() => {
  console.log("HTTP server running!")
})