import { CustomForm, ObservableBoolean, ObservableString, ObservableUIRawMessage, TextFieldOptions, UIRawMessage } from "@minecraft/server-ui";

export class TextFieldFilter {
    
    static readonly POSITIVE_INTEGER = new TextFieldFilter(/\D/g);
    static readonly INTEGER = new TextFieldFilter(/[^-\d]/g);
    static readonly HEX = new TextFieldFilter(/[^\dA-F]/g);
    static readonly LETTER = new TextFieldFilter(/[^A-Z]/g);

    readonly filter: RegExp;

    private constructor(filter: RegExp) {
        this.filter = filter;
    }
}

export class BetterTextField {

    private readonly filter: RegExp | undefined;
    private readonly suggestion: ObservableString;
    private readonly maxLength: number
    private readonly label: ObservableString | ObservableUIRawMessage | string | UIRawMessage;

    public readonly _visible = new ObservableBoolean(true);

    public constructor(label: ObservableString | ObservableUIRawMessage | string | UIRawMessage, textFieldFilter: TextFieldFilter | RegExp | undefined, suggestion: string, maxLength: number, changedListener?: (newText: string) => void) {
        this.label = label;
        this.filter = (textFieldFilter instanceof RegExp) ? textFieldFilter : (textFieldFilter?.filter);
        this.suggestion = new ObservableString(suggestion, { clientWritable: true });
        this.suggestion.subscribe(text => {
            let newText: string;
            if (this.filter == undefined) {
                newText = this.setLength(text);
            } else {
                newText = this.setLength(text.toUpperCase().replaceAll(this.filter, ""));
                if (newText != text) {
                    this.suggestion.setData(newText);
                }
            }
            if (changedListener) {
                changedListener(newText);
            }
        });
        this.maxLength = maxLength;
    }

    private setLength(text: string): string {
        return text.substring(0, Math.min(this.maxLength, text.length));
    }

    public getValue(): string {
        return this.suggestion.getData();
    }

    public setValue(value: string): void {
        this.suggestion.setData(value);
    }

    public setVisible(b: boolean) {
        this._visible.setData(b);
    }

    public getVisible(): boolean {
        return this._visible.getData();
    }

    public addToCustomForm(customForm: CustomForm): this {
        customForm.textField(this.label, this.suggestion, { visible: this._visible });
        return this;
    }
}