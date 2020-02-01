// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');
const {CustomPromptBot } = require('../dialogs/customPromptBot')
const {MakeReservationDialog } = require('../dialogs/makeReservationDialog')
const {CancelReservationDialog } = require('../dialogs/cancelReservationDialog')
const CONVERSATION_DATA_PROPERTY = 'conversationData';
var conversationData = "";

class DispatchBot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();

        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
      //  if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');        

        this.conversationState = conversationState;
        this.userState = userState;
       
        this.dialogState = this.conversationState.createProperty('DialogState');
        this.previousIntent = this.conversationState.createProperty('previousIntent');
        this.previousRecognizerResult = this.conversationState.createProperty('previousRecognizerResult');
        this.conversationData = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);

        this.customPromoptDialog = new CustomPromptBot(this.conversationState,this.conversationData,this.userState);
        this.makeReservationDialog = new MakeReservationDialog(this.conversationState,this.conversationData,this.userState);
        this.cancelReservationDialog = new CancelReservationDialog(this.conversationState,this.conversationData,this.userState);
        // If the includeApiResults parameter is set to true, as shown below, the full response
        // from the LUIS api will be made available in the properties  of the RecognizerResult
        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${ process.env.LuisAPIHostName }.api.cognitive.microsoft.com`
        }, {
            includeAllIntents: true,
            includeInstanceData: true
        }, true)    ;

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });

        this.dispatchRecognizer = dispatchRecognizer;
        this.qnaMaker = qnaMaker;

this.onMessage(async (context, next) => {
            console.log(this.dialogState)
            console.log('Processing Message Activity.');

            // First, we use the dispatch model to determine which cognitive service (LUIS or QnA) to use.

            const recognizerResult = await dispatchRecognizer.recognize(context);

            // Top intent tell us which cognitive service to use.
            console.log("LUIS ALL RESULTS### ",recognizerResult)
            const intent = LuisRecognizer.topIntent(recognizerResult);

            // Use Below calls if you want to handle dispatching query to QnAMaker OR LUIS directly by picking best confidence score
            if(recognizerResult.text !== "")
            {
             var intentWithScore = recognizerResult.luisResult.topScoringIntent;
             console.log("LUIS TOP RESULTS### ",intentWithScore['intent'])
             console.log("LUIS TOP RESULTS### ",intentWithScore['score'])
            }
            console.log("checking QNA result now")
             var results = await this.qnaMaker.getAnswers(context);
             console.log("QNA RESULTS##",JSON.stringify(results))
            
             if(results.length >= 1)
             {
             console.log("QNA RESULT##  ", results[0].score)
             console.log("QNA RESULT##  ", results[0].answer)
             }
            // console.log('Running dialog with Message Activity. QNA result length: '+ results.length + 'LUIS Output: ' + recognizerResult.luisResult.topScoringIntent  );
 
            if(results.length >= 1 &&  recognizerResult.text !== "" ){
                console.log("inside case 1")
               if ( results[0].score > recognizerResult.luisResult.topScoringIntent['score'])  
            {
                console.log("inside case 1.1")

                //Send request to QNAMAKER 

                conversationData = await this.conversationData.get(
                    context, { promptActive: false, endDialog: true });

                    if(conversationData.promptActive == false && conversationData.endDialog == true) {
                        console.log("inside case 1.1.1")

                        console.log("No previous convo active.Sending request to QNAMaker");
                        await context.sendActivity(`${ results[0].answer }`);
                         await next();
                        }
                        
                    else if (conversationData.promptActive == true) {
                        console.log("inside case 1.1.2")
                          //  console.log("GIve out QnaAnswer and get back to previous Topic")
                            var prevContext = context;

                           // await context.sendActivity(`${ results[0].answer }`);

                            // Go to current intent recognized and we call the dispatcher with the top intent.
                            await this.dispatchToTopIntentAsync(prevContext, this.previousIntent, this.previousRecognizerResult);
                            await next();
                           }


               }
               else 
            {

                // Sending to Luis intent dialog
                conversationData = await this.conversationData.get(
                    context, { promptActive: false, endDialog: true });
                   

                    if(conversationData.promptActive == false && conversationData.endDialog == true) {

                        console.log("No previous convo active.Sending request to current intent recognized");
                        this.previousRecognizerResult = recognizerResult;
                        this.previousIntent = intent;
                        await this.conversationData.set(
                            context, { promptActive: true, endDialog: false });
                        
                         // Go to current intent recognized and we call the dispatcher with the top intent.
                         await this.dispatchToTopIntentAsync(context, intent, recognizerResult);
                         await next();
                        }
                        
                        else if (conversationData.promptActive == true) {
                            console.log("Previous convo active. Sending data to previous dialog with context")
                            // Go to current intent recognized and we call the dispatcher with the top intent.
                            await this.dispatchToTopIntentAsync(context, this.previousIntent, this.previousRecognizerResult);
                            await next();
                           }
               }

            }
            else if (results.length < 1 &&  recognizerResult.text !== "")
            {
               //Send to Luis
               console.log("inside case 2")
                   conversationData = await this.conversationData.get(
                    context, { promptActive: false, endDialog: true });
          
                    if(conversationData.promptActive == false && conversationData.endDialog == true) {
                        console.log("inside case 2.1")

                        console.log("No QNA answer found. No previous convo active.Sending request to current LUIS intent recognized");
                        this.previousRecognizerResult = recognizerResult;
                        this.previousIntent = intent;
                        await this.conversationData.set(
                            context, { promptActive: true, endDialog: false });
                        
                         // Go to current intent recognized and we call the dispatcher with the top intent.
                         await this.dispatchToTopIntentAsync(context, intent, recognizerResult);
                         await next();
                        }
                        
                        else if (conversationData.promptActive == true) {
                            console.log("inside case 2.2")
                            console.log("NO QNA answer found. Previous convo active. Sending data to previous dialog with context")
                            // Go to current intent recognized and we call the dispatcher with the top intent.
                            await this.dispatchToTopIntentAsync(context, this.previousIntent, this.previousRecognizerResult);
                            await next();
                           }
            }
            else if (results.length > 1  && recognizerResult.text == ""){
                console.log("inside case 3")
                // Send to QNA
                
                conversationData = await this.conversationData.get(
                    context, { promptActive: false, endDialog: true });

                    if(conversationData.promptActive == false && conversationData.endDialog == true) {
                        console.log("inside case 3.1")

                        console.log("No previous convo active.Sending request to QNAMaker");
                        await context.sendActivity(`${ results[0].answer }`);
                         await next();
                        }
                        
                    else if (conversationData.promptActive == true) {
                        console.log("inside case 3.2")
                           /*
                            console.log("GIve out QnaAnswer and get back to previous Topic")
                            var prevContext = context;

                            await context.sendActivity(`${ results[0].answer }`);
                            */
                           console.log("Sticking to previous topic as prompt is active.")
                            // Go to current intent recognized and we call the dispatcher with the top intent.
                            await this.dispatchToTopIntentAsync(prevContext, this.previousIntent, this.previousRecognizerResult);
                            await next();
                           }

               

            }
            else if (results.length < 1  && recognizerResult.text == ""){
                console.log("inside case 4")

               //Send to LUIS node intent Default case

                              //Send to Luis

                              conversationData = await this.conversationData.get(
                                context, { promptActive: false, endDialog: true });
                      
                                if(conversationData.promptActive == false && conversationData.endDialog == true) {
                                    console.log("inside case 4.1")
            
                                    console.log("No LUIS and QNA answer found. No previous convo active.Sending request to current LUIS None intent");
                                    //this.previousRecognizerResult = recognizerResult;
                                    //this.previousIntent = intent;
                                    await this.conversationData.set(
                                        context, { promptActive: true, endDialog: false });
                                    
                                     // Go to current intent recognized and we call the dispatcher with the top intent.
                                     await this.dispatchToTopIntentAsync(context, "None", recognizerResult);
                                     await next();
                                    }
                                    
                                    else if (conversationData.promptActive == true) {
                                        console.log("inside case 4.2")
                                        console.log("NO QNA  and LUIS answer found. Previous convo active. Sending data to previous dialog with context")
                                        // Go to current intent recognized and we call the dispatcher with the top intent.
                                        await this.dispatchToTopIntentAsync(context, this.previousIntent, this.previousRecognizerResult);
                                        await next();
                                       }

            }
            else
            {

                console.log("inside case LAST")
               //No cases matched:
               console.log("No Cases. No previous convo active.Sending request to current LUIS None intent");
               //this.previousRecognizerResult = recognizerResult;
               //this.previousIntent = intent;
               await this.conversationData.set(
                   context, { promptActive: true, endDialog: false });
               
                // Go to current intent recognized and we call the dispatcher with the top intent.
                await this.dispatchToTopIntentAsync(context, "None", recognizerResult);
                await next();
            }   

         

         
            

            
        });

  this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });


        this.onMembersAdded(async (context, next) => {
            const welcomeText = 'Type a greeting or a question about the weather to get started.';
            const membersAdded = context.activity.membersAdded;

            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(`Welcome to Dispatch bot ${ member.name }. ${ welcomeText }`);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
    

    async dispatchToTopIntentAsync(context, intent, recognizerResult) {
        //console.log(context)
        switch (intent) {
        case 'MakePayment':
           
            await this.customPromoptDialog.run(context,this.dialogState,this.conversationData)
            conversationData.endDialog = await this.customPromoptDialog.isDialogCompleted();
            if (conversationData.endDialog == true)
            {
                await this.conversationData.set(
                    context, { promptActive: false, endDialog: true });
            }
            break;    

        case 'MakeReservation':
           
            await this.makeReservationDialog.run(context,this.dialogState,this.conversationData)
            conversationData.endDialog = await this.makeReservationDialog.isDialogCompleted();
            if (conversationData.endDialog == true)
            {
                await this.conversationData.set(
                    context, { promptActive: false, endDialog: true });
            }
            break;  
        case 'CancelRoom':
            
            await this.cancelReservationDialog.run(context,this.dialogState,this.conversationData)
            conversationData.endDialog = await this.cancelReservationDialog.isDialogCompleted();
            if (conversationData.endDialog == true)
            {
                await this.conversationData.set(
                    context, { promptActive: false, endDialog: true });
            }
            break;     
        case 'QNA':
            await this.processSampleQnA(context);
            break;
        default:
            console.log(`Dispatch unrecognized intent: ${ intent }.`);
            
            await context.sendActivity(`Dispatch unrecognized intent: ${ intent }.`);
            await this.conversationData.set(
                context, { promptActive: false, endDialog: true });
            break;
        }
    }
    

    async processHomeAutomation(context, luisResult) {
        console.log('processHomeAutomation');

        // Retrieve LUIS result for Process Automation.
        const result = luisResult;
        const intent = result.topScoringIntent.intent;

        await context.sendActivity(`HomeAutomation top intent ${ intent }.`);
        await context.sendActivity(`HomeAutomation intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`HomeAutomation entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    async processWeather(context, luisResult) {
        console.log('processWeather');

        // Retrieve LUIS results for Weather.
        const result = luisResult.connectedServiceResult;
        const topIntent = result.topScoringIntent.intent;

        await context.sendActivity(`ProcessWeather top intent ${ topIntent }.`);
        await context.sendActivity(`ProcessWeather intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`ProcessWeather entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    /*
    async processSampleQnA(context) {
        console.log('processSampleQnA');

        const results = await this.qnaMaker.getAnswers(context);

        if (results.length > 0) {
            await context.sendActivity(`${ results[0].answer }`);
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Q and A system.');
        }
    }
    */
}

module.exports.DispatchBot = DispatchBot;
