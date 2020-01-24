// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DatePrompt,
    DateTimePrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');
const { UserProfile } = require('../userProfile');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const DATETIME_PROMPT ='DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';


// Import AdaptiveCard content.
   const CancelReservationCard = require('../resources/adaptiveCards/cancelReservationCard');
   const GetDateTimeCard = require('../resources/adaptiveCards/getDateTimeCard');

// const ImageGalleryCard = require('../resources/ImageGalleryCard.json');


// Create array of AdaptiveCard content, this will be used to send a random card to the user.

const CARDS = [
    CancelReservationCard,
    GetDateTimeCard
    // ImageGalleryCard,

];

var endDialog = false;

const { SomeOtherDialog, SOME_OTHER_DIALOG } = require('./someOtherDialog');
const { EndDialog, END_DIALOG } = require('./endDialog');

class CancelReservationDialog extends ComponentDialog {
    
    constructor(conversationState,conversationData,userState) {
        super('cancelReservationDialog');
        
        this.conversationState = conversationState;
        this.conversationData = conversationData;
        this.userState = userState;
        this.userProfile = userState.createProperty(USER_PROFILE);
        

       // this.logger = logger;

        this.addDialog(new TextPrompt(TEXT_PROMPT,this.promptValidator));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        //this.addDialog(new DatePrompt(TIME_PROMPT));
        this.addDialog(new SomeOtherDialog(this.conversationState,this.conversationData,this.userState));
        this.addDialog(new EndDialog(this.conversationState,this.conversationData,this.userState));


        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),
            this.confirmStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step) {
       // console.log("Inside Step firstStep", CARDS[0])
        endDialog = false;
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        await step.context.sendActivity({
            text: 'Enter reservation details for cancellation:',
            attachments: [CardFactory.adaptiveCard(CARDS[1])]
        });

        return await step.prompt(TEXT_PROMPT, '');
    }
        
    

    async confirmStep(step) {
        console.log("Data from adaptive card",step.context.activity.value)
       // step.values.resno = step.result;

       const msg = `You are about to cancel your reservation number:  ${ JSON.stringify(step.values.resno)} ?`;

        // We can send messages to the user at any point in the WaterfallStep.
        //await step.context.sendActivity(msg);
         await step.context.sendActivity(msg);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, 'Are you sure ?', ['yes', 'no']);
    }

    async summaryStep(step) {
        console.log("step.result.value: 2",step.result)
        if (step.result === true) {
            
            // Get the current profile object from user state.
            const userProfile = await this.userProfile.get(step.context, new UserProfile());
           // console.log("step.values.resno", step.values.resno)


            userProfile.resno = step.values.resno;

            console.log("values assigned to userprofile")
         //   let msg = `Reservation confirmed for  ${ userProfile.name } at ${ new Date().getTime() } with following details:\n Number of participants: ${ userProfile.noOfParticipants }\n Rservation date: ${ userProfile.date } \nReservation time : ${ userProfile.time }.`;
           
            
            await step.context.sendActivity("Reservation Confirmed");
            await this.conversationData.set(
                step.context, { promptActive: false, endDialog: true });
            return await step.endDialog();
            
        } else {
            await step.context.sendActivity('Thanks. No reservation was made');
            return await step.replaceDialog(END_DIALOG);
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
        return await step.endDialog();
        
    }

    isDialogCompleted()
    {
        return endDialog;
    }
    async numberPromptValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
    }
      // prompt validate function
      async promptValidator(promptContext){
        const activity = promptContext.context.activity;
        return activity.type === 'message' && activity.channelData.postBack;
    }
}

module.exports.CancelReservationDialog = CancelReservationDialog;
