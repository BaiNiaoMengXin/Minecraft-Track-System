import { Player, system } from "@minecraft/server";
import { CustomForm, ObservableBoolean } from "@minecraft/server-ui";
import { NameColorDataBase } from "data/NameColorDataBase";
import { BetterTextField } from "./BetterTextField";
import { IGui } from "data/IGui";
import { DeleteConfirmationScreen } from "./DeleteConfirmationScreen";

export class DashboardListSelectorScreen {

    private customFormOuter!: CustomForm;
    private customFormInner!: CustomForm;

    private readonly player: Player;
    private readonly onCloseCallback: () => void;
    private readonly allData: Array<NameColorDataBase>;
    private readonly selectedIds: Array<number>;
    private readonly isSingleSelect: boolean;
    private readonly canRepeat: boolean;

    private selectedList!: InstanceType<typeof DashboardListSelectorScreen.WidgetList>
    private availableList!: InstanceType<typeof DashboardListSelectorScreen.WidgetList>

    constructor(player: Player, onCloseCallback: () => void, allData: Array<NameColorDataBase>, selectedIds: Array<number>, isSingleSelect: boolean, canRepeat: boolean) {
        this.player = player;
        this.onCloseCallback = onCloseCallback;
        this.allData = allData;
        this.selectedIds = selectedIds;
        this.isSingleSelect = isSingleSelect;
        this.canRepeat = canRepeat;

        this.regenerate(2);
    }

    private regenerate(isInner: boolean | number) {
        if (isInner == 2 || isInner == 0) {
            this.customFormOuter = new CustomForm(this.player, { translate: "gui.mts.selected" })
            this.customFormOuter.button({ translate: "gui.done" }, () => {
                this.customFormOuter.close();
                this.onCloseCallback();
            });
            this.customFormOuter.button({ translate: "options.dev_addLabel" }, () => {
                this.customFormOuter.close();
                this.regenerate(true);
                system.run(() => this.customFormInner.show());
            });

            this.selectedList = new DashboardListSelectorScreen.WidgetList(this.getSelectedListData(), undefined, (data, index) => this.onDelete(data, index)).addToCustomForm(this.player, this.customFormOuter);
        } 
        if (isInner == 2 || isInner == 1) {
            this.customFormInner = new CustomForm(this.player, { translate: "gui.mts.available" }).closeButton();
            this.availableList = new DashboardListSelectorScreen.WidgetList(this.getAvailableListData(), (data) => this.onAdd(data), undefined).addToCustomForm(this.player, this.customFormInner);
        }
    }

    public show() {
        this.customFormOuter.show();
    }

    private getSelectedListData() {
        const selectedData: NameColorDataBase[] = [];
        for (const selectedId of this.selectedIds) {
            const data = this.allData.find(data => data.id == selectedId);
            if (data) {
                selectedData.push(data);
            }
        }
        return selectedData;
    }

    private getAvailableListData() {
        const availableData: NameColorDataBase[] = [];
        for (const data of this.allData) {
            if (this.canRepeat || !this.selectedIds.includes(data.id)) {
                availableData.push(data);
            }
        }
        return availableData;
    }

    private onAdd(data: NameColorDataBase) {
    	this.selectedIds.push(data.id);

        this.regenerate(true);
        system.run(() => this.customFormInner.show().then(onfulfilled => {
            if (onfulfilled == "ClientClosed") {
                this.regenerate(false);
                system.run(() => this.customFormOuter.show());
            }
        }));
    }

    private onDelete(data: NameColorDataBase, index: number) {
        this.selectedIds.splice(index);

        this.regenerate(false);
        system.run(() => this.customFormOuter.show());
    }


    private static readonly WidgetList = class {

        private readonly textFieldSearch: BetterTextField
        private readonly buttonVisibles: Array<ObservableBoolean>;
        private readonly onAdd: ((data: NameColorDataBase) => void) | undefined;
        private readonly onDelete: ((data: NameColorDataBase, index: number) => void) | undefined;

        private dataSorted: Array<NameColorDataBase>;

        constructor(dataSorted: Array<NameColorDataBase>, onAdd: ((data: NameColorDataBase) => void) | undefined, onDelete: ((data: NameColorDataBase, index: number) => void) | undefined) {
            this.textFieldSearch = new BetterTextField({ translate: "gui.mts.search" }, undefined, "", 64, text => {
                for (let i = 0; i < this.dataSorted.length; i++) {
                    if (this.dataSorted[i].name.toLowerCase().includes(text.toLowerCase())) {
                        this.buttonVisibles[i].setData(true);
                    } else {
                        this.buttonVisibles[i].setData(false);
                    }
                }
            });

            this.dataSorted = dataSorted;
            this.buttonVisibles = new Array(dataSorted.length);
            for (let i = 0; i < this.buttonVisibles.length; i++) {
                this.buttonVisibles[i] = new ObservableBoolean(true);
            }

            this.onAdd = onAdd;
            this.onDelete = onDelete;
        }

        public addToCustomForm(player: Player, customForm: CustomForm): this {
            this.textFieldSearch.addToCustomForm(customForm);
            for (let i = 0; i < this.dataSorted.length; i++) {
                const currentIndex = i;
                customForm.button(IGui.formatStationName(this.dataSorted[i].name), () => {
                    if (this.onAdd == undefined && this.onDelete != undefined) {
                        customForm.close();

                        system.run(() => new DeleteConfirmationScreen(player, isDelete => {
                            if (isDelete) {
                                this.onDelete!(this.dataSorted[currentIndex], currentIndex);
                            } else {
                                system.run(() => customForm.show());
                            }
                        }, "").show());
                    } else if (this.onAdd != undefined && this.onDelete == undefined) {
                        customForm.close();
                        this.onAdd(this.dataSorted[currentIndex]);
                    }  
                }, { visible: this.buttonVisibles[i] });
            }

            return this;
        }
    }
}
