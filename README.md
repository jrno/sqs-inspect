# sqs-inspect

Simple tool to download and inspect queue data from SQS. Useful for example when inspecting items from dead letter queue. Sqs doesn't provide any good interface to inspect the messages for certain data.

## How it works

Simply receives all messages from given queue and produce the final result to a json file. Messages are fetched with all attributes.

## How to run

TODO: fill

## TODO:

- build/run without ts-node
- add --search argument for inspection
