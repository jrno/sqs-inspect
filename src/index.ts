import { SQS } from 'aws-sdk'
import yargs, { Argv } from 'yargs'

function getArgs(): Argv {
    return yargs(process.argv)
        .option('aws_access_key', {
            demand: true
        })
        .option('aws_secret_key', {
            demand: true,
        })
        .option('sqs_queue', {
            describe: 'Name of the sqs queue to download from',
            demand: true
        })
        .option('path', {
            describe: 'Download path. Default to current location',
            demand: false,
            default: '.'
        })
        .help('h')
}

const argv = getArgs().argv
const sqs = new SQS({
    credentials: {
        accessKeyId: argv.aws_access_key as string,
        secretAccessKey: argv.aws_secret_key as string
        // session token?
    }
})

console.log("Listing queues")
sqs.listQueues({}, (err, data) => {
    if (err) {
        console.log("Error", err)
    } else {
        console.log("Success", data)
    }
});

// TODO: region as input
// TODO: receive messages from queue
// TODO: write received messages with all attributes to local folder
// TODO: check how to grep data from the folder
// TODO: omit download if data exists. --tmp_path = "./ted-local"
// TODO: omit search if phrase not given --search "123456"

