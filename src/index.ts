import { SQS } from 'aws-sdk'
import yargs, { Argv } from 'yargs'
import * as fs from 'fs'
import { Message } from 'aws-sdk/clients/sqs'

const visibilityTimeout = 60 
const messagesPerReceive = 1 // 1-10

async function getMessageCount(sqs: SQS, queueUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
        sqs.getQueueAttributes({QueueUrl: queueUrl, AttributeNames: ["All"]}, (err, data) => {
            console.log
            if (err) {
                reject(err)
            } else if (data.Attributes) {
                console.log(data.Attributes)
                resolve(Number(data.Attributes.ApproximateNumberOfMessages))
            }
        })
    })
}

async function receiveMessages(sqs: SQS, queueUrl: string): Promise<Message[]> {
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
            } else if (data.Messages) {
                resolve(data.Messages)
            }
        })
    })
}

function getArgs(): Argv {
    return yargs(process.argv)
        .option('aws_region', {
            default: 'eu-north-1'
        })
        .option('aws_access_key', {
            demand: true
        })
        .option('aws_secret_key', {
            demand: true,
        })
        .option('queue_url', {
            describe: 'Sqs queue url',
            demand: true
        })
        .option('filename', {
            describe: 'Filename to write the output, defauts to sqs-inspect.json',
            demand: false,
        })
        .help('h')
}

async function run() {
    const argv = getArgs().argv
    const sqs = new SQS({
        region: argv.aws_region as string,
        credentials: {
            accessKeyId: argv.aws_access_key as string,
            secretAccessKey: argv.aws_secret_key as string
        }
    })
    const fileName = argv.filename ? argv.filename as string : `sqs-inspect.json` as string
    const queueUrl = argv.queue_url as string
    console.log(`Fetching from ${queueUrl}. max_messages_per_poll: ${messagesPerReceive}, visibility_timeout: ${visibilityTimeout}`)
    console.log("Fetching approximate count of messages...")
    let queuedMessages = await getMessageCount(sqs, queueUrl);

    if (queuedMessages === 0) {
        console.log("Queue doesn't have any (visible) messages. Process will exit...")
        process.exit()
    }

    let messages: Message[] = []
    while (messages.length < queuedMessages) {
        messages = messages.concat(await receiveMessages(sqs, queueUrl))
        console.log(`${messages.length} of ${queuedMessages} messages received...`)
    }

    fs.writeFile(fileName, JSON.stringify(messages, null, 2), () => {
        console.log(`Output written to ${fileName}`)
    });
}

run()

// TODO: region as input
// TODO: receive messages from queue
// TODO: write received messages with all attributes to local folder
// TODO: check how to grep data from the folder
// TODO: omit download if data exists. --tmp_path = "./ted-local"
// TODO: omit search if phrase not given --search "123456"

