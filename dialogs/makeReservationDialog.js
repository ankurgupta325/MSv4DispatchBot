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
const { UserProfile } = require('../userProfile');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const DATETIME_PROMPT ='DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = false;
const { SomeOtherDialog, SOME_OTHER_DIALOG } = require('./someOtherDialog');
const { EndDialog, END_DIALOG } = require('./endDialog');

class MakeReservationDialog extends ComponentDialog {
    
    constructor(userState, logger) {
        super('makeReservationDialog');

        this.userProfile = userState.createProperty(USER_PROFILE);

        this.logger = logger;

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        //this.addDialog(new DatePrompt(TIME_PROMPT));
        this.addDialog(new SomeOtherDialog());
        this.addDialog(new EndDialog());


        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),
            this.getName.bind(this),
            this.getNumberOfParticipants.bind(this),
            this.getDate.bind(this),
            this.getTime.bind(this),
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
        endDialog = false;
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(CONFIRM_PROMPT, 'Would you like to make a reservation?', ['yes', 'no']);
    }
        
    async getName(step) {
        console.log(step.result.value)
        if(step.result.value == "no" )
          {
        return await step.replaceDialog(END_DIALOG);
           }
       else 
       {

           return await step.prompt(TEXT_PROMPT, 'In what name reservation is to be made?');
       }


}
    async getNumberOfParticipants(step) {
           
        step.values.name = step.result;
                return await step.prompt(NUMBER_PROMPT, 'How many participants ( 0 - 150)?');
     

    
    }

    async getDate(step) {
        step.values.noOfParticipants = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        //await step.context.sendActivity(`Thanks ${ step.result }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(DATETIME_PROMPT, 'For which date you want to make reservation?');
    }

    async getTime(step) {
        step.values.date = step.result;

        return await step.prompt(DATETIME_PROMPT, 'Enter the time ?');
       
    }

    async confirmStep(step) {
        step.values.time = step.result;

        const msg = `Your reservation details are :\n Number of participants:  ${ step.values.noOfParticipants }\n Date:  ${ step.values.date }\n Time:  ${ step.values.time }.`;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(msg);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, 'Please confirm the details are correct?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result.value ="yes") {
            // Get the current profile object from user state.
            const userProfile = await this.userProfile.get(step.context, new UserProfile());

            userProfile.name = step.values.name;
            userProfile.noOfParticipants = step.values.noOfParticipants;
            userProfile.date = step.values.date;
            userProfile.time = step.values.time;

         //   let msg = `Reservation confirmed for  ${ userProfile.name } at ${ new Date().getTime() } with following details:\n Number of participants: ${ userProfile.noOfParticipants }\n Rservation date: ${ userProfile.date } \nReservation time : ${ userProfile.time }.`;
           
            endDialog = true;
            await step.context.sendActivity("Reservation Confirmed");
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
}

module.exports.MakeReservationDialog = MakeReservationDialog;
