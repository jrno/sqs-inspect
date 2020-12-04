import { SQS } from "aws-sdk";
import { Message } from "aws-sdk/clients/sqs";
import logger from "./logger";

interface InformativeSqsMessage {
    messageId: string,
    sentTime: string,
    sentTimeEpoch: number,
    firstReceiveTime: string,
    attributes: object,
    body: object
}

function parseJsonBody(body: string|undefined): object {
    try {
        return body ? JSON.parse(body) : {}
    } catch (err) {
        logger.warn('Payload not in json format', body)
        return {}
    }
}

/**
 * Render a message object to a more friendly format, epoch seconds as timestamps etc.
 */
function prettify(messages: Message[]): InformativeSqsMessage[] {
    if (!messages?.length) {
        return []
    }
    return messages.map(message => {
        return {
            messageId: message.MessageId ?? 'Unknown',
            sentTime: new Date(Number(message.Attributes?.SentTimestamp)).toISOString(),
            sentTimeEpoch: Number(message.Attributes?.SentTimestamp),
            firstReceiveTime: new Date(Number(message.Attributes?.ApproximateFirstReceiveTimestamp)).toISOString(),
            attributes: message.MessageAttributes ?? {},
            body: parseJsonBody(message.Body)
        }
    }).sort((a, b) => b.sentTimeEpoch - a.sentTimeEpoch)
}

async function receive(sqs: SQS, queue: string, visibilityTimeout: number, messageCount: number): Promise<Message[]> {    
    if (messageCount <= 0) {
        return []
    }

    const messages = await sqs.receiveMessage({        
        AttributeNames: ["All"],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All"],
        QueueUrl: queue,
        VisibilityTimeout: visibilityTimeout,
        WaitTimeSeconds: 0
    }).promise().then(data => data?.Messages ?? [])

    logger.info(`${messages.length} messages received...`)
    return Array.prototype.concat(messages, await receive(sqs, queue, visibilityTimeout, messageCount - messages.length))
}

async function getMessageData(sqs: SQS, queueUrl: string): Promise<InformativeSqsMessage[]> {
    const messageCountInQueue = await sqs.getQueueAttributes({QueueUrl: queueUrl, AttributeNames: ["All"]})
        .promise()
        .then(msg => Number(msg?.Attributes?.ApproximateNumberOfMessages) ?? 0)

    const visibilityTimeout = Math.max(15, messageCountInQueue / 4)
    logger.info(`Queue has approximately ${messageCountInQueue} messages, using visibility timeout of ${visibilityTimeout}s`)

    return prettify(await receive(sqs, queueUrl, visibilityTimeout, messageCountInQueue))
}   

export { getMessageData }