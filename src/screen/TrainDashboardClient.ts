import { Player, RGBA, system, TextPrimitive, Vector3, world } from "@minecraft/server";
import { CustomForm, MessageBox, ObservableBoolean, ObservableNumber, ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";
import { CollisionDetector } from "data/Base";
import { BetterMap } from "data/BetterMap";
import { DataCache } from "data/DataCache";
import { Depot } from "data/Depot";
import { NameColorDataBase } from "data/NameColorDataBase";
import { Platform } from "data/Platform";
import { Route, RoutePlatform } from "data/Route";
import { Station } from "data/Station";
import { TransportMode } from "data/TransportMode";
import { ArrayList } from "jLib/ArrayList";
import { MTS } from "MTS";
import { ParticleSystem } from "rail/ParticleSystem";
import { BlockPos } from "util/math/BlockPos";
import { Tuple } from "util/Tuple";

enum SelectedTab {
    NONE,
    STATIONS,
    ROUTES,
    DEPOTS
}

export class TrainDashboardClient {
    
    public static readonly ITEM_TYPE_ID = "mts:railway_dashboard";
    
    public playerSecondChoicesPos: Vector3 | null = null;

    private selectedTab = SelectedTab.NONE;

    public isOnAwait = false;

    private editingSite: NameColorDataBase | null = null;
    private isNew = false;

    private tempCorner1: Tuple<number, number> | null = null;
    private tempCorner2: Tuple<number, number> | null = null;
    private tempSelectPlatfroms = new ArrayList<Platform>();
    private tempSelectRoutes = new ArrayList<Route>();
    private isSelectingCorners = false;

    private player: Player;

    private indexPage: CustomForm;
    private sitesPages: CustomForm = undefined as any;
    private editSitePage: CustomForm = undefined as any;
    private selectStationsPage: CustomForm = undefined as any;
    private editInstructionsPage: CustomForm = undefined as any;

    private sliders = new Array<ObservableNumber>(Depot.HOURS_IN_DAY);

    private disabledEditDoneButton = new ObservableBoolean(false);
    private textFieldName = new ObservableString("", { clientWritable: true });
    private warningMessage = new ObservableString("");
    private dataCache: DataCache;

    private static MAX_TRAIN_PER_HOUR = 5;
    
    private static WARNING_MESSAGE_UPDATE_TICKS = 10;

    private static CREATE_LABEL = "新增";
    private static STATION_LABEL = "车站";
    private static ROUTE_LABEL = "路线";
    private static DEPOT_LABEL = "车厂";

    public constructor(player: Player) {
        this.dataCache = MTS.railwayData.dataCache;
        this.player = player;

        this.indexPage = new CustomForm(player, "铁路仪表板");
        this.indexPage.closeButton();
        this.indexPage.button(TrainDashboardClient.STATION_LABEL, () => {
            this.updateSitesPageTo(this.dataCache.stations, TrainDashboardClient.STATION_LABEL);
            this.indexPage.close();
            this.showSitesPage();
            this.selectedTab = SelectedTab.STATIONS;
        })

        this.indexPage.button(TrainDashboardClient.ROUTE_LABEL, () => {
            this.updateSitesPageTo(this.dataCache.routes, TrainDashboardClient.ROUTE_LABEL);
            this.indexPage.close();
            this.showSitesPage();
            this.selectedTab = SelectedTab.ROUTES;
        })
        this.indexPage.button(TrainDashboardClient.DEPOT_LABEL, () => {
            this.updateSitesPageTo(this.dataCache.depots, TrainDashboardClient.DEPOT_LABEL);
            this.indexPage.close();
            this.showSitesPage();
            this.selectedTab = SelectedTab.DEPOTS;
        });

        this.textFieldName.subscribe(newValue => this.updateWarningMessage());
        for (let i = 0; i < Depot.HOURS_IN_DAY; i++) {
            this.sliders[i] = new ObservableNumber(0, { clientWritable: true });
            const index = i;
            this.sliders[i].subscribe(newValue => {
                if (this.editingSite instanceof Depot) {
                    this.editingSite.setFrequency(newValue, index);
                }
            });
        }
    }

    public static getPlayerFacingPos(player: Player): Vector3 {
        const block = player.getBlockFromViewDirection({ maxDistance: 10 })?.block;
        if (!block) {
            const headLoc = player.getHeadLocation();
            const viewDirection = player.getViewDirection();
            const distance = 10;
            return {
                x: ~~Math.ceil(headLoc.x + viewDirection.x * distance) - 1,
                y: ~~Math.ceil(headLoc.y + viewDirection.y * distance),
                z: ~~Math.ceil(headLoc.z + viewDirection.z * distance) - 1
            };
        }
        else {
            return block.location;
        }
    }

    public use() {
        if (this.isOnAwait) {
            return;
        }
        try {
            if (this.isSelectingCorners) {
                if (!this.playerSecondChoicesPos) {
                    this.playerSecondChoicesPos = TrainDashboardClient.getPlayerFacingPos(this.player);
                    return;
                }
                else {
                    const pos2 = TrainDashboardClient.getPlayerFacingPos(this.player);
                    this.tempCorner1 = new Tuple(this.playerSecondChoicesPos.x, this.playerSecondChoicesPos.z);
                    this.tempCorner2 = new Tuple(pos2.x, pos2.z);
                    this.playerSecondChoicesPos = null;
                    this.isSelectingCorners = false;
                }
            }
            if (!this.editingSite) {
                system.run(() => this.indexPage.show());
                this.selectedTab = SelectedTab.NONE;
            } else {
                this.showEditSitePage();
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    private stopEditing() {
        this.editingSite = null;
        this.playerSecondChoicesPos = null;
        this.tempCorner1 = null;
        this.tempCorner2 = null;
        this.tempSelectPlatfroms.clear();
        this.tempSelectRoutes.clear();
        this.isSelectingCorners = false;
    }
    
    private updateSitesPageTo(sites: Set<NameColorDataBase>, showLabel: string) {
        this.sitesPages = new CustomForm(this.player, showLabel).closeButton().button(TrainDashboardClient.CREATE_LABEL + showLabel, () => {
            this.isNew = true;
            this.editingSite = this.selectedTab == SelectedTab.STATIONS ? new Station() : (this.selectedTab == SelectedTab.ROUTES ? new Route(TransportMode.TRAIN) : new Depot(TransportMode.TRAIN));
            this.updateEditSitePage(sites, showLabel);
            this.sitesPages.close()
            this.showEditSitePage();
        });
        sites.forEach((site) => {
            this.sitesPages.button(site.name, () => {
                this.isNew = false;
                this.editingSite = site;
                this.updateEditSitePage(sites, showLabel);
                this.sitesPages.close()
                this.showEditSitePage();
            });
        });
    }
    
    private showSitesPage() {
        system.run(() => this.sitesPages.show().then(onfulfilled => {
            if (onfulfilled == "ClientClosed") {
                this.use();
            }
        }));
    }
    
    private updateSelectStationsPage() {
        this.selectStationsPage = new CustomForm(this.player, "").closeButton().button("完成", () => {
            this.selectStationsPage.close()
            this.showEditSitePage();
        });
        this.selectStationsPage.button("添加站台", () => {
            this.isOnAwait = true;
            this.selectStationsPage.close();
        }, { disabled: this.dataCache.platformIdToStation.size == 0 });
        this.tempSelectPlatfroms.forEach((platfrom, i) => {
            const index = i;
            this.selectStationsPage.button(`${this.dataCache.platformIdToStation.get(platfrom.id)!.name}  ${platfrom.name}`, () => {
                this.selectStationsPage.close()
                system.run(() => {
                    new MessageBox(this.player, "你要从路线里删除这个站台吗?").button1("确认").button2("取消").show().then(onfulfilled => {
                        if (onfulfilled.selection === 0) {
                            this.tempSelectPlatfroms.remove(index);
                            this.updateSelectStationsPage();
                        }
                        this.showSelectStationsPage();
                    });
                });
            });
        });
    }
    
    private showSelectStationsPage() {
        system.run(() => this.selectStationsPage.show().then(async (onfulfilled) => {
            if (onfulfilled == "ClientClosed") {
                this.tempSelectPlatfroms.clear();
            }
            else if (onfulfilled == "ServerClosed" && this.isOnAwait) {
                const platform = await this.waitForPlatformSelectResult();
                this.isOnAwait = false;
                this.tempSelectPlatfroms.push(platform);
                this.updateSelectStationsPage();
                this.showSelectStationsPage();
            }
        }));
    }
    
    private updateEditInstructionsPage() {
        this.editInstructionsPage = new CustomForm(this.player, "").closeButton().button("完成", () => {
            this.editInstructionsPage.close()
            this.showEditSitePage();
        });
        this.editInstructionsPage.button("添加路线", () => {
            const routeListPage = new CustomForm(this.player, "");
            const routes = ArrayList.from(this.dataCache.routes);
            routes.forEach(route => routeListPage.button(route.name, () => {
                this.tempSelectRoutes.push(route);
                this.updateEditInstructionsPage();
                this.showEditInstructionsPage();
            }));
            this.editInstructionsPage.close();
            system.run(() => routeListPage.show());
        });
        this.tempSelectRoutes.forEach((route, i) => {
            const index = i;
            this.editInstructionsPage.button(route.name, () => {
                this.editInstructionsPage.close()
                system.run(() => {
                    new MessageBox(this.player, "你要从车厂里移除这个线路吗?").button1("确认").button2("取消").show().then(onfulfilled => {
                        if (onfulfilled.selection === 0) {
                            this.tempSelectRoutes.remove(index);
                            this.updateEditInstructionsPage();
                        }
                        this.showEditInstructionsPage();
                    });
                });
            });
        });
    }
    
    private showEditInstructionsPage() {
        system.run(() => this.editInstructionsPage.show().then(onfulfilled => {
            if (onfulfilled == "ClientClosed") {
                this.tempSelectRoutes.clear();
            }
        }));
    }
    
    private updateEditSitePage(sites: Set<NameColorDataBase>, showLabel: string) {
        this.updateWarningMessage();
        this.textFieldName.setData(this.editingSite!.name);
        this.editSitePage = new CustomForm(this.player, "")
            .closeButton()
            .textField(this.warningMessage, this.textFieldName)
            .spacer();
        if (this.editingSite instanceof Route) {
            this.tempSelectPlatfroms = ArrayList.from(this.editingSite.platformIds, item => this.dataCache.platformIdMap.get(item.platformId)!);
            this.editSitePage.button(`${this.isNew ? "选择" : "重选"}线路`, () => {
                this.updateSelectStationsPage();
                this.editSitePage.close()
                this.showSelectStationsPage();
            });
        }
        else {
            this.editSitePage.button(`${this.isNew ? "选择" : "重选"}范围`, () => {
                this.isSelectingCorners = true;
                this.editSitePage.close();
            });
        }
        const saveRouteData = () => {
            if (!this.tempSelectRoutes.isEmpty() && this.editingSite instanceof Depot) {
                this.editingSite.routeIds.clear();
                this.tempSelectRoutes.forEach((route) => (this.editingSite as Depot).routeIds.push(route.id));
            }
        };
        if (this.editingSite instanceof Depot) {
            const depot = this.editingSite;
            this.tempSelectRoutes = ArrayList.from(depot.routeIds, routeId => this.dataCache.routeIdMap.get(routeId)!);
            this.editSitePage.button("编辑指令", () => {
                this.updateEditInstructionsPage();
                this.editSitePage.close()
                this.showEditInstructionsPage();
            });
            this.editSitePage.button("刷新路线", () => {
                saveRouteData();
                MTS.railwayData.railwayDataPathGenerationMoudle.generatePath(depot.id);
            });
            this.editSitePage.button("清除车辆", () => {
                const sidingsInDepot = DataCache.areaIdToSavedRails(depot, this.dataCache.sidings);
                Array.from(sidingsInDepot.values()).forEach(siding => siding.clearTrains());
            });
            this.editSitePage.spacer();
            this.editSitePage.button("重置时刻表", () => {
                this.sliders.forEach((slider) => slider.setData(0));
                depot.departures.length = 0;
            });
            this.sliders.forEach((slider, i) => {
                slider.setData(depot.getFrequency(i));
                this.editSitePage.slider("每小时车辆数", slider, 0, TrainDashboardClient.MAX_TRAIN_PER_HOUR * 2, { step: 1 });
            });
        }
        this.editSitePage.button("确定", () => {
            if (this.editingSite instanceof Station || this.editingSite instanceof Depot) {
                if (this.tempCorner1 && this.tempCorner2) {
                    this.editingSite.setCorners(this.tempCorner1.getA(), this.tempCorner1.getB(), this.tempCorner2.getA(), this.tempCorner2.getB());
                } else if (this.isNew) {
                    this.warningMessage.setData("§c§l你还没有选择范围");
                    return;
                }
            }
            this.editingSite!.name = this.textFieldName.getData();
            if (!this.tempSelectPlatfroms.isEmpty() && this.editingSite instanceof Route) {
                this.editingSite.platformIds.clear();
                this.tempSelectPlatfroms.forEach((platfrom) => (this.editingSite as Route).platformIds.push(new RoutePlatform(platfrom.id)));
            }
            saveRouteData();
            if (this.isNew) {
                if (this.editingSite instanceof Route) {
                    this.dataCache.routes.add(this.editingSite);
                } else if (this.editingSite instanceof Station) {
                        this.dataCache.stations.add(this.editingSite);
                } else {
                    this.dataCache.depots.add(this.editingSite as Depot);
                }
            }
            this.dataCache.sync();
            this.stopEditing();
            this.editSitePage.close()
            this.updateSitesPageTo(sites, showLabel);
            this.showSitesPage();
        }, { disabled: this.disabledEditDoneButton });
    }
    
    private showEditSitePage() {
        system.run(() => this.editSitePage.show().then(onfulfilled => {
            if (onfulfilled == "ClientClosed") {
                this.stopEditing();
                this.showSitesPage();
            }
        }));
    }
    
    private updateWarningMessage() {
        const sites = this.selectedTab == SelectedTab.STATIONS ? this.dataCache.stations : (this.selectedTab == SelectedTab.ROUTES ? this.dataCache.routes : this.dataCache.depots);
        const name = this.textFieldName.getData();
        if (!this.editingSite) {
            this.warningMessage.setData("");
            this.disabledEditDoneButton.setData(true);
            return;
        }
        if (!name || name.trim() === "") {
            this.warningMessage.setData("§c§l名称不能为空");
            this.disabledEditDoneButton.setData(true);
            return;
        }
        const nameTaken = Array.from(sites as Set<NameColorDataBase>).some(site => site.id !== this.editingSite!.id && site.name === name);
        if (nameTaken) {
            this.warningMessage.setData("§c§l名称已被占用");
            this.disabledEditDoneButton.setData(true);
        } else {
            this.warningMessage.setData("");
            this.disabledEditDoneButton.setData(false);
        }
    }
    
    private waitForPlatformSelectResult(): Promise<Platform> {
        return new Promise((resolve) => {
            let resultPlatform: Platform | null = null;
            const posToPlatforms = new BetterMap<BlockPos, Array<Platform>>();
            const playerPos = this.player.location;
            const renderDistance = this.player.clientSystemInfo.maxRenderDistance * 16;
            this.dataCache.platforms.forEach(savedRail => {
                if (this.dataCache.platformIdToStation.has(savedRail.id)) {
                    const pos = savedRail.getMidPos();
                    if (pos.distanceTo(new BlockPos(playerPos)) < renderDistance) {
                        if (!posToPlatforms.has(pos)) {
                            posToPlatforms.set(pos, new Array())
                        }
                        posToPlatforms.get(pos)!.push(savedRail);
                    }
                }
            })
            const doSomethingWhileWaiting = () => {
                resultPlatform = null;

                posToPlatforms.forEach((savedRails, savedRailPos) => {
                    const savedRailCount = savedRails.length;
                    for (let i = 0; i < savedRailCount; i++) {
                        const x = savedRailPos.getX() + 0.5;
                        const y = savedRailPos.getY() + 4;
                        const z = savedRailPos.getZ() + (i + 0.5) / savedRailCount;
                        const text = savedRails[i].name;

                        let aColor: RGBA;
                        const isCollision = resultPlatform === null && CollisionDetector.isPlayerLookingAtOBB(this.player, {
                            center: { x: x, y: y, z: z },
                            dimensions: { x: 2, y: 2, z: 2 },
                            rotation: { x: 0, y: 0 }
                        })
                        if (isCollision) {
                            aColor = { red: 0, green: 0.9, blue: 0, alpha: 0.8 };
                            resultPlatform = savedRails[i];
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
                });
            }

            const intervalId = system.runInterval(() => {
                doSomethingWhileWaiting();
            }, 4)

            const callback = world.afterEvents.itemUse.subscribe(event => {
                if (event.source.id === this.player.id && event.itemStack && event.itemStack.typeId === TrainDashboardClient.ITEM_TYPE_ID && resultPlatform) {
                    world.afterEvents.itemUse.unsubscribe(callback);
                    system.clearRun(intervalId);
                    resolve(resultPlatform);
                }
            });
        })
    }
}