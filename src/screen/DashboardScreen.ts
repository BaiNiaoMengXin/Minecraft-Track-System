import { Player, RawMessage, RGBA, system, TextPrimitive, Vector3, world } from "@minecraft/server";
import { CustomForm, MessageBox, ObservableBoolean, ObservableNumber, ObservableString, ObservableUIRawMessage, UIRawMessage } from "@minecraft/server-ui";
import { CollisionDetector } from "data/Base";
import { BetterMap } from "data/BetterMap";
import { DataCache } from "data/DataCache";
import { Depot } from "data/Depot";
import { IGui } from "data/IGui";
import { NameColorDataBase } from "data/NameColorDataBase";
import { RailType } from "data/RailType";
import { Route, RoutePlatform } from "data/Route";
import { SavedRailBase } from "data/SavedRailBase";
import { Siding } from "data/Siding";
import { Station } from "data/Station";
import { TrainType } from "data/TrainType";
import { TransportMode } from "data/TransportMode";
import { TrainProperties } from "extensions/TrainProperties";
import { TrainRegistry } from "extensions/TrainRegistry";
import { ArrayList } from "jLib/ArrayList";
import { MTS } from "MTS";
import { ParticleSystem } from "rail/ParticleSystem";
import { BlockPos } from "util/math/BlockPos";
import { Tuple } from "util/Tuple";
import { BetterTextField, TextFieldFilter } from "./BetterTextField";
import { RailwayData } from "data/RailwayData";
import { SidingScreen } from "./SidingScreen";
import { EditDepotScreen } from "./EditDepotScreen";
import { EditStationScreen } from "./EditStationScreen";
import { EditRouteScreen } from "./EditRouteScreen";
import { PlatformScreen } from "./PlatformScreen";
import { Platform } from "data/Platform";
import { DeleteConfirmationScreen } from "./DeleteConfirmationScreen";
import { ConfigScreen } from "./ConfigScreen";
import { RailActionsScreen } from "./RailActionsScreen";


export class DashboardScreen {

    public static readonly ITEM_TYPE_ID = "mts:railway_dashboard";

    private transportMode = TransportMode.TRAIN;
    
    public selectedTab = DashboardScreen.SelectedTab.NONE;
    public isOnAwait = false;
    public isNew = false;
    public player: Player;

    private editingSite: NameColorDataBase | null = null;

    private indexPage: CustomForm;
    private selectStationsPage!: CustomForm;
    private sitesPages!: CustomForm;

    public tempSelectSavedRails = new ArrayList<SavedRailBase>

    private dataCache: DataCache;

    public constructor(player: Player) {
        this.dataCache = MTS.railwayData.dataCache;
        this.player = player;

        this.indexPage = new CustomForm(player, "铁路仪表板");
        this.indexPage.closeButton();
        this.indexPage.button({ translate: "gui.mts.stations" }, () => {
            this.selectedTab = DashboardScreen.SelectedTab.STATIONS;
            this.regenerateSitesPage();
            this.indexPage.close();
            this.showSitesPage();
        })

        this.indexPage.button({ translate: "gui.mts.routes" }, () => {
            this.selectedTab = DashboardScreen.SelectedTab.ROUTES;
            this.regenerateSitesPage();
            this.indexPage.close();
            this.showSitesPage();
        })
        this.indexPage.button({ translate: "gui.mts.depots" }, () => {
            this.selectedTab = DashboardScreen.SelectedTab.DEPOTS;
            this.regenerateSitesPage();
            this.indexPage.close();
            this.showSitesPage();
        });

        this.indexPage.button({ translate: "gui.mts.rail_actions_button" }, () => {
            this.selectedTab = DashboardScreen.SelectedTab.NONE;
            this.indexPage.close();
            system.run(() => new RailActionsScreen(this).show())
        });
        this.indexPage.button({ translate: "menu.options" }, () => {
            this.selectedTab = DashboardScreen.SelectedTab.NONE;
            this.indexPage.close();
            system.run(() => new ConfigScreen(this).show())
        });
    }

    public use() {
        if (this.isOnAwait) {
            return;
        }
        this.indexPage.show();
    }

    private startEditing() {
        this.sitesPages.close();
        system.run(() => {
            if (this.selectedTab == DashboardScreen.SelectedTab.STATIONS) {
                new EditStationScreen(this.editingSite as Station, this, () => this.stopEditing()).show();
            } else if (this.selectedTab == DashboardScreen.SelectedTab.ROUTES) {
                new EditRouteScreen(this.editingSite as Route, this, () => this.stopEditing()).show();
            } else {
                new EditDepotScreen(this.editingSite as Depot, this.transportMode, this, () => this.stopEditing()).show();
            }
        });
    }

    private stopEditing() {
        if (this.isNew && this.editingSite) {
            if (this.editingSite instanceof Station) {
                this.dataCache.stations.add(this.editingSite)
            } else if (this.editingSite instanceof Route) {
                this.dataCache.routes.add(this.editingSite)
            } else {
                this.dataCache.depots.add(this.editingSite as Depot)
            }
        }

        this.dataCache.sync();

        this.editingSite = null;
        this.isNew = false;
    }

    private regenerateSitesPage() {
        let datas: Set<NameColorDataBase>;
        let addButtonLabelKeyBase: string
        switch (this.selectedTab) {
            case DashboardScreen.SelectedTab.STATIONS:
                datas = this.dataCache.stations;
                addButtonLabelKeyBase = "station";
                break;
            case DashboardScreen.SelectedTab.ROUTES:
                datas = this.dataCache.routes;
                addButtonLabelKeyBase = "route";
                break;
            default:
                datas = this.dataCache.depots;
                addButtonLabelKeyBase = "depot";
                break;
        }

        this.sitesPages = new CustomForm(this.player, { translate: `gui.mts.${addButtonLabelKeyBase}s` }).closeButton();
        
        this.sitesPages.button({ translate: "gui.mts.add_" + addButtonLabelKeyBase }, () => {
            this.isNew = true;
            this.editingSite = this.selectedTab == DashboardScreen.SelectedTab.STATIONS ? new Station() : (this.selectedTab == DashboardScreen.SelectedTab.ROUTES ? new Route(TransportMode.TRAIN) : new Depot(TransportMode.TRAIN));

            this.startEditing();
        });

        if (this.selectedTab == DashboardScreen.SelectedTab.DEPOTS || this.selectedTab == DashboardScreen.SelectedTab.STATIONS) {
            const isPlatform = this.selectedTab == DashboardScreen.SelectedTab.STATIONS;

            this.sitesPages.spacer().button("select a platform/siding to edit", () => {
                this.isOnAwait = true;
                this.sitesPages.close()
            }, { disabled: (isPlatform ? this.dataCache.platforms : this.dataCache.sidings).size == 0 }).spacer();
        }

        datas.forEach((data) => {
            this.sitesPages.button(IGui.formatStationName(data.name), () => {
                this.isNew = false;
                this.editingSite = data;

                this.startEditing();
            });
        });
    }

    private showSitesPage() {
        system.run(() => this.sitesPages.show().then(async (onfulfilled) => {
            if (onfulfilled == "ClientClosed") {
                this.use();
            } else if (onfulfilled == "ServerClosed" && this.isOnAwait) {
                const savedRail = await this.waitForSavedRailSelectResult(this.selectedTab == DashboardScreen.SelectedTab.DEPOTS, true);
                this.isOnAwait = false;

                const savedRailScreen = this.selectedTab == DashboardScreen.SelectedTab.DEPOTS ? new SidingScreen(savedRail as Siding, this.transportMode, this) : new PlatformScreen(savedRail as Platform, this.transportMode, this);
                system.run(() => savedRailScreen.show());
            }
        }));
    }
    
    public updateSelectStationsPage(c: () => void) {
        this.selectStationsPage = new CustomForm(this.player, "").closeButton().button("完成", () => {
            this.selectStationsPage.close()
            c()
        });
        this.selectStationsPage.button("添加站台", () => {
            this.isOnAwait = true;
            this.selectStationsPage.close();
        }, { disabled: this.dataCache.platformIdToStation.size == 0 });
        this.tempSelectSavedRails.forEach((platform, i) => {
            const customDestinationPrefix = "";
            const station = this.dataCache.platformIdToStation.get(platform.id);
            let buttonLabel: string
            if (station != undefined) {
                buttonLabel = `${customDestinationPrefix}${station.name} (${platform.name})`;
            } else {
                buttonLabel = `${customDestinationPrefix}(${platform.name})`;
            }

            this.selectStationsPage.button(IGui.formatStationName(buttonLabel), () => {
                this.selectStationsPage.close()
                system.run(() => {
                    new DeleteConfirmationScreen(this.player, isDelete => {
                        if (isDelete) {
                            this.tempSelectSavedRails.remove(i);
                            this.updateSelectStationsPage(c);
                        }
                        this.showSelectStationsPage(c)
                    }, "").show()
                });
            });
        });
    }
    
    public showSelectStationsPage(x: () => void) {
        system.run(() => this.selectStationsPage.show().then(async (onfulfilled) => {
            if (onfulfilled == "ClientClosed") {
                this.tempSelectSavedRails.clear();
            }
            else if (onfulfilled == "ServerClosed" && this.isOnAwait) {
                const platform = await this.waitForSavedRailSelectResult(false, true);
                this.isOnAwait = false;
                this.tempSelectSavedRails.push(platform);
                this.updateSelectStationsPage(x);
                this.showSelectStationsPage(x);
            }
        }));
    }
    
    public waitForSavedRailSelectResult(isSiding: boolean, showNotInMaps: boolean): Promise<SavedRailBase> {
        // TODOOOOOOOOO!!!

        return new Promise((resolve) => {
            let resultSavedRail: SavedRailBase | null = null;
            const posToSavedRails = new BetterMap<BlockPos, Array<SavedRailBase>>();
            const renderDistance = (this.player.clientSystemInfo.maxRenderDistance - 3) * 16;
            (isSiding ? this.dataCache.sidings : this.dataCache.platforms).forEach(savedRail => {
                if (showNotInMaps || (isSiding ? this.dataCache.sidingIdToDepot : this.dataCache.platformIdToStation).has(savedRail.id)) {
                    const pos = savedRail.getMidPos();
                    if (!posToSavedRails.has(pos)) {
                        posToSavedRails.set(pos, new Array())
                    }
                    posToSavedRails.get(pos)!.push(savedRail);
                }
            })

            const doSomethingWhileWaiting = () => {
                resultSavedRail = null;
                const playerPos = new BlockPos(this.player.location);

                posToSavedRails.forEach((savedRails, savedRailPos) => {
                    if (savedRailPos.distanceTo(playerPos)) {
                        const savedRailCount = savedRails.length;
                        for (let i = 0; i < savedRailCount; i++) {
                            const x = savedRailPos.getX() + 0.5;
                            const y = savedRailPos.getY() + 4;
                            const z = savedRailPos.getZ() + (i + 0.5) / savedRailCount;
                            const text = savedRails[i].name;

                            let aColor: RGBA;
                            const isCollision = resultSavedRail === null && CollisionDetector.isPlayerLookingAtOBB(this.player, {
                                center: { x: x, y: y, z: z },
                                dimensions: { x: 3, y: 3, z: 3 },
                                rotation: { x: 0, y: 0 }
                            })
                            if (isCollision) {
                                aColor = { red: 0, green: 0.9, blue: 0, alpha: 0.8 };
                                resultSavedRail = savedRails[i];
                            } else {
                                aColor = { red: 0.8, green: 1, blue: 0.8, alpha: 0.5 }
                            }

                            ParticleSystem.layNumberlayParticle(
                                Number(text),
                                { x: x + 0.5, y: y, z: z + 0.5 },
                                { x: 0, y: 0, z: 0 },
                                { x: 0, y: 0 },
                                aColor,
                                2
                            );
                        }
                    }
                });
            }

            const intervalId = system.runInterval(() => {
                doSomethingWhileWaiting();
            }, 4)

            const callback = world.afterEvents.itemUse.subscribe(event => {
                if (event.source.id === this.player.id && event.itemStack && event.itemStack.typeId === DashboardScreen.ITEM_TYPE_ID && resultSavedRail) {
                    world.afterEvents.itemUse.unsubscribe(callback);
                    system.clearRun(intervalId);
                    resolve(resultSavedRail);
                }
            });
        })
    }
}

export namespace DashboardScreen {
    export enum SelectedTab {
        NONE,
        STATIONS,
        ROUTES,
        DEPOTS
    }
}
