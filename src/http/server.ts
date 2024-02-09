import cookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import 'dotenv/config';
import fastify from "fastify";
import {createPoll} from "./routes/create-poll";
import {getPoll, getPolls} from "./routes/get-poll";
import {voteOnPoll} from "./routes/vote-on-poll";
import {pollResults} from "./ws/poll-results";

const app = fastify();

app.register(cookie, { 
  secret: process.env.SECRET,
  hook: 'onRequest'
})

app.register(fastifyWebsocket)

app.register(createPoll)
app.register(getPoll, getPolls)
app.register(voteOnPoll)

app.register(pollResults)

app.listen({port: 5000}).then(() => {
  console.log("HTTP server running!")
})