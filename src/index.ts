import { SQS } from 'aws-sdk'
import yargs, { Argv } from 'yargs'
import * as fs from 'fs'
import { Message } from 'aws-sdk/clients/sqs'

async function getMessageCount(sqs: SQS, queueUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
        sqs.getQueueAttributes({QueueUrl: queueUrl, AttributeNames: ["All"]}, (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(Number(data?.Attributes?.ApproximateNumberOfMessages ?? 0))
            }
        })
    })
}

async function receiveMessages(sqs: SQS, queueUrl: string, messagesPerReceive: number = 10, visibilityTimeout: number = 30): Promise<Message[]> {
    return new Promise((resolve, reject) => {
        sqs.receiveMessage({
            MaxNumberOfMessages: messagesPerReceive,
            MessageAttributeNames: ["All"],
            QueueUrl: queueUrl,
            VisibilityTimeout: visibilityTimeout,
            WaitTimeSeconds: 0
        }, (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data?.Messages ?? [])
            }
        })
    })
}

function getArgs(): Argv {
    return yargs(process.argv)
        .option('aws_region', {
            describe: "Aws region",
            demand: false,
            default: 'eu-north-1'
        })
        .option('aws_access_key', {
            describe: "Aws access key",
            demand: true
        })
        .option('aws_secret_key', {
            describe: "Aws secret access key",
            demand: true,
        })
        .option('aws_session_token', {
            describe: "Optional session token",
            demand: false,
        })
        .option('sqs_queue_url', {
            describe: 'Sqs queue endpoint url',
            demand: true
        })
        .option('max_messages_per_receive', {
            describe: 'Max number of messages per receive. 1 - 10',
            default: 10
        })
        .option('visibility_timeout', {
            describe: 'Time in seconds that received messages are hidden in queue. Adjust to a value that is larger than the process time.',
            default: 30
        })
        .option('outfile', {
            describe: 'Output filename',
            demand: false,
            default: 'sqs-inspect.json'
        })
        .help('h')
}

async function run() {

    const args = getArgs().argv
    console.log('Sqs inspect started. Process arguments:', args)

    const sqs = new SQS({
        region: args.aws_region as string,
        credentials: {
            accessKeyId: args.aws_access_key as string,
            secretAccessKey: args.aws_secret_key as string,
            sessionToken: args.aws_session_token ? args.aws_session_token as string : undefined 
        }
    })
    const outFile = args.outfile as string
    const sqsQueueUrl = args.sqs_queue_url as string
    const maxMessagesPerReceive = args.max_messages_per_receive as number
    const visibilityTimeout = args.visibility_timeout as number

    console.log("Fetch approximate count of available messages")
    let queuedMessages = await getMessageCount(sqs, sqsQueueUrl);

    if (queuedMessages === 0) {
        console.log("Queue doesn't have any available messages, process will exit")
        process.exit()
    }

    let messages: Message[] = []
    while (messages.length < queuedMessages) {
        process.stdout.write(`Polling new messages... `)
        messages = messages.concat(await receiveMessages(sqs, sqsQueueUrl, maxMessagesPerReceive, visibilityTimeout))
        console.log(`${messages.length} of ${queuedMessages} fetched`)
    }

    console.log(`Writing results to file`)
    fs.writeFile(outFile, JSON.stringify(messages, null, 2), () => {
        console.log(`Results stored to ${outFile}`)
    });
}

try {
    run()
} catch (err) {
    console.error("Unexpected error occured", err)
}

// TODO: check how to grep data from the folder
// TODO: omit search if phrase not given --search "123456"

