import {randomUUID} from "crypto";
import {FastifyInstance} from "fastify";
import {z} from "zod";
import {prisma} from "../../lib/prisma";
import {redis} from "../../lib/redis";
import {voting} from "../../utils/voting-pub-sub";

const publishVote = (pollId: string, pollOptionId: string, votes: string) => {
  voting.publish(pollId, {
    pollOptionId,
    votes: Number(votes)
  })
}

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    })

    const {pollOptionId} = voteOnPollBody.parse(request.body);
    const {pollId} = voteOnPollParams.parse(request.params);

    let {sessionId} = request.cookies;

    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {sessionId, pollId}
        }
      })

      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {id: userPreviousVoteOnPoll.id}
        })

        const votes = await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.id)

        publishVote(pollId, userPreviousVoteOnPoll.pollOptionId, votes)
      } else if (userPreviousVoteOnPoll) {
        return reply.status(400).send({message: "You are already vote in this poll"})
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();
  
      reply.setCookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        signed: true,
        httpOnly: true
      })
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    })

    const votes = await redis.zincrby(pollId, 1, pollOptionId)

    publishVote(pollId, pollOptionId, votes)
  
    return reply.status(201).send()
  })
}