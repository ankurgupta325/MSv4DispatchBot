
const { ChoicePrompt, ComponentDialog, WaterfallDialog } = require('botbuilder-dialogs');

const END_DIALOG = 'END_DIALOG';

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class EndDialog extends ComponentDialog {
    constructor() {
        super(END_DIALOG);
       
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.endStep.bind(this)
        ]));
    }

    async endStep(step) {
        await step.context.sendActivity("How can help you?");
        return await step.endDialog();
      
    }
}



module.exports.EndDialog = EndDialog;
module.exports.END_DIALOG = END_DIALOG;