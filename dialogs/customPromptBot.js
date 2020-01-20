// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { UserProfile } = require('../userProfile');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = false;
const { SomeOtherDialog, SOME_OTHER_DIALOG } = require('./someOtherDialog');
const { EndDialog, END_DIALOG } = require('./endDialog');

class CustomPromptBot extends ComponentDialog {
    
    constructor(userState, logger) {
        super('userProfileDialog');

        this.userProfile = userState.createProperty(USER_PROFILE);

        this.logger = logger;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new SomeOtherDialog());
        this.addDialog(new EndDialog());


        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.transportStep.bind(this),
            this.exitStep.bind(this),
            this.nameStep.bind(this),
            this.nameConfirmStep.bind(this),
            this.ageStep.bind(this),
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

    async transportStep(step) {
        endDialog = false;
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Please provide the type of issue with mpaas?',
            choices: ChoiceFactory.toChoices(['Bug', 'Enhancement', 'Downtime','None of these'])
        });
    }
          
    async exitStep(step) {
        step.values.transport = step.result.value;

        console.log(JSON.stringify(step.result.value))

        if(step.result.value == "None of these" )
        {
            return await step.replaceDialog(END_DIALOG);
            //return await step.prompt(END_CONFIRM_PROMPT, 'Do you want to end current topic and start over?', ['yes', 'no']);


        }
        else
        {
        console.log("1111")
        return await step.next();
        }
       
        // We can send messages to the user at any point in the WaterfallStep.
        //await step.context.sendActivity(`Thanks ${ step.result }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
      //  return await step.prompt(END_CONFIRM_PROMPT, 'Do you want to end current topic and start over?', ['yes', 'no']);
    }


    async nameStep(step) {
        //step.values.transport = step.result.value;
        return await step.prompt(NAME_PROMPT, `Which application in mpaas have the issue? `);
    }

    async nameConfirmStep(step) {
        step.values.name = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        //await step.context.sendActivity(`Thanks ${ step.result }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, 'Do you have more details for the application issue?', ['yes', 'no']);
    }

    async ageStep(step) {
        if (step.result) {
            // User said "yes" so we will be prompting for the age.
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
            const promptOptions = { prompt: 'Please provide the issue in details.', retryPrompt: 'Please provide the issue in details.' };

            return await step.prompt(NAME_PROMPT, promptOptions);
        
        } else {
            // User said "no" so we will skip the next step. Give -1 as the age.
            return await step.next(-1);
        }
    }

    async confirmStep(step) {
        step.values.age = step.result;

        const msg = step.values.age === -1 ? 'No details are provided.' : `Your application has below issue as per your details:\n  ${ step.values.age }.`;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(msg);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Is this okay?' });
    }

    async summaryStep(step) {
        if (step.result) {
            // Get the current profile object from user state.
            const userProfile = await this.userProfile.get(step.context, new UserProfile());

            userProfile.transport = step.values.transport;
            userProfile.name = step.values.name;
            userProfile.age = step.values.age;

            let msg = `I am raising a JIRA ticket for mPAAS with below details \n\n TICKET NO: ${ new Date().getTime() } \nISSUE TYPE : ${ userProfile.transport } \nAPPLICATION NAME : ${ userProfile.name }.`;
            if (userProfile.age !== -1) {
                msg += ` \n DETAILS : ${ userProfile.age }.`;
            }
            endDialog = true;
            await step.context.sendActivity(msg);
        } else {
            await step.context.sendActivity('Thanks. Your profile will not be kept.');
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
        return await step.endDialog();
    }

    isDialogCompleted()
    {
        return endDialog;
    }
    async agePromptValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
    }
}

module.exports.CustomPromptBot = CustomPromptBot;
