// === require dependencies ===
const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk')

// === delcare constants ===
const SKILL_NAME = 'home-monitor-skill'
const HELP_MESSAGE = 'You can say what is the temperature, or, you can say exit... What can I help you with?'
const HELP_REPROMPT = 'What can I help you with?'
const STOP_MESSAGE = 'Goodbye!'

// instantiate dynamo client to talk to db
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1'})

// === handlers for alexa ===
const handlers = {
    LaunchRequest: function () {
        this.emit('temperature')
    },
    temperature: function () {
        console.log('processing request to get latest temperature reading')
        const _self = this
        const params = {
            TableName: 'temperatures',
            ExpressionAttributeValues: {
                ':timestamp': Date.now() - 86400000 // get rows newer than yesterday
            },
            FilterExpression: "#t > :timestamp",
            ExpressionAttributeNames: {
                '#t': "timestamp"
            }
        }
        
        docClient.scan(params, function(err, data) {
            console.log('!!! here')
            console.log(data)
            if (err) {
                // an error occurred while trying to communicate with the db
                console.warn(`error querying database: "${err}"`)
                //resp(500, { error: err })
            } else {
                // success
                const mostRecentItem = data.Items.reduce(
                    (acc, curr) => curr.timestamp > acc.timestamp ? curr : acc,
                    { timestamp: 0 })
                console.log(`results ready ${JSON.stringify(mostRecentItem)}`)
                const temp = mostRecentItem.temperature
                _self.response.cardRenderer(SKILL_NAME, '' + temp)
                _self.response.speak(`the current temperature is ${temp}`)
                _self.emit(':responseReady')
            }
        })
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE
        const reprompt = HELP_REPROMPT

        this.response.speak(speechOutput).listen(reprompt)
        this.emit(':responseReady')
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE)
        this.emit(':responseReady')
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE)
        this.emit(':responseReady')
    }
};

// === Request Handler ===
exports.handler = (event, context, complete) => {
    const alexa = Alexa.handler(event, context, complete)
    alexa.registerHandlers(handlers)
    alexa.execute()
}
