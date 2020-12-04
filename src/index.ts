import { SQS } from 'aws-sdk'
import logger from './log'
import * as fs from 'fs'
import { getMessageData, getOptions } from './sqs-inspect'

async function run() {
    const options = getOptions()
    logger.info(`Sqs inspect started for ${options.sqs_queue_url}`)

    const sqs = new SQS({
        region: options.aws_region as string,
        credentials: {
            accessKeyId: options.aws_access_key as string,
            secretAccessKey: options.aws_secret_key as string,
            sessionToken: options.aws_session_token ? options.aws_session_token as string : undefined 
        }
    })

    const messages = await getMessageData(sqs, options.sqs_queue_url)
    fs.writeFile(options.outfile, JSON.stringify(messages, null, 2), () => {
        logger.info(`${options.outfile} created...`)
    });
}

try {
    run()
} catch (err) {
    console.error("Unexpected error occured", err)
}
