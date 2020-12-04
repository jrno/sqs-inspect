import { SQS } from "aws-sdk";
import { Message } from "aws-sdk/clients/sqs";
import yargs from "yargs";
import logger from "./log";

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

function getOptions(): {
    aws_access_key: string;
    aws_secret_key: string;
    aws_region: string;
    aws_session_token?: string | undefined;
    sqs_queue_url: string;
    sqs_messages_per_receive: number;
    sqs_visibility_timeout: number;
    outfile: string;
} {
    const args = yargs(process.argv)
        .option('aws_access_key', {
            type: 'string',
            demand: true
        })
        .option('aws_secret_key', {
            type: 'string',
            describe: "Aws secret access key",
            demand: true,
        })
        .option('aws_region', {
            type: 'string',
            default: 'eu-north-1'
        })
        .option('aws_session_token', {
            type: 'string',
            demand: false
        })
        .option('sqs_queue_url', {
            type: 'string',
            describe: 'Sqs queue endpoint url',
            demand: true
        })
        .option('sqs_messages_per_receive', {
            type: 'number',
            describe: 'Max number of messages per receive. 1 - 10',
            default: 10
        })
        .option('sqs_visibility_timeout', {
            type: 'number',
            describe: 'Time in seconds that received messages are hidden in queue. Adjust to a value that is larger than the process time.',
            default: 30
        })
        .option('outfile', {
            type: 'string',
            default: 'sqs-inspect.json'
        })
        .help('h')

        // assert max receive 1-10
        // assert visibility positive
        return args.argv
}

async function getMessageData(sqs: SQS, queueUrl: string): Promise<InformativeSqsMessage[]> {
    const messageCountInQueue = await sqs.getQueueAttributes({QueueUrl: queueUrl, AttributeNames: ["All"]})
        .promise()
        .then(msg => Number(msg?.Attributes?.ApproximateNumberOfMessages) ?? 0)

    const visibilityTimeout = Math.max(15, messageCountInQueue / 4)
    logger.info(`Queue has approximately ${messageCountInQueue} messages, using visibility timeout of ${visibilityTimeout}s`)

    return prettify(await receive(sqs, queueUrl, visibilityTimeout, messageCountInQueue))
}   

export { 
    getOptions, 
    getMessageData 
}