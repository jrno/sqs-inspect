import yargs from "yargs"

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

export { getOptions }
