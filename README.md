# sqs-inspect

Small convenience utility over the standard aws cli functionality to fetch all messages from sqs queue (for example dead letter queue) to a more user friendly form for inspection. Messages are polled in batches and aren't released back to the queue immediately, instead visibility timeout is adjusted based on approximate number of messages in the queue.

To run
```
yarn run sqs-inspect --aws_access_key "..." --aws_secret_key "..." --sqs_queue_url "https://sqs.eu-north-1.amazonaws.com/123/queue-name" 
```

Will store data as `sqs-inspect.json`

