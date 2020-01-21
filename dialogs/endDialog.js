
const { ChoicePrompt, ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');

const END_DIALOG = 'END_DIALOG';

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = false;

class EndDialog extends ComponentDialog {
    constructor(conversationState,conversationData,userState) {
        super(END_DIALOG);
        this.conversationState = conversationState;
        this.conversationData = conversationData;
        this.userState = userState;
       
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.endStep.bind(this)
        ]));
    }
    // async run(turnContext, accessor) {
    //     const dialogSet = new DialogSet(accessor);
    //     dialogSet.add(this);

    //     const dialogContext = await dialogSet.createContext(turnContext);
    //     const results = await dialogContext.continueDialog();
    //     if (results.status === DialogTurnStatus.empty) {
    //         await dialogContext.beginDialog(this.id);
    //     }
    // }

    async endStep(step) {
        
        console.log("this.conversationData#########: ",JSON.stringify(this.conversationData))
        await step.context.sendActivity("How can help you?");
        await this.conversationData.set(
            step.context, { promptActive: false, endDialog: true });
        return await step.endDialog();
        
        
    }
}



module.exports.EndDialog = EndDialog;
module.exports.END_DIALOG = END_DIALOG;