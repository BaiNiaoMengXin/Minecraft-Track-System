import { world, system, Player, RGBA } from '@minecraft/server';
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { Train } from 'data/Train';
import { Station } from "data/Station";
import { Depot } from 'data/Depot.js';
import { SavedRailBase } from 'data/SavedRailBase.js';
import { TransportMode } from 'data/TransportMode.js';
import { Route, RoutePlatform } from 'data/Route.js';
import { Platform } from 'data/Platform.js';
import { BlockPos } from 'util/math/BlockPos.js';
import { DataCache } from 'data/DataCache.js';
import { CollisionDetector, TimeUnit } from 'data/Base.js';
import { MTS } from 'MTS.js';
import { PlayerEvents } from 'PlayerEvents.js';
import { ParticleSystem } from 'rail/ParticleSystem.js';
import { BetterMap } from 'data/BetterMap';
enum SelectionType{
    noSelection,
    Station,
    Depot
}

export class RailwayDashboard {
    public IsOnAwait: boolean = false;
    private IndexPage : ActionFormData;
    private dataCache: DataCache;


    private StationPage : ActionFormData | undefined;


    private RoutePage : ActionFormData | undefined;

    
    private DepotPage : ActionFormData | undefined;
    private DepotEditorPage : ActionFormData | undefined;
    private DepotDepartureTimesEditorPage : ModalFormData | undefined;


    private CreateDataBasePage : ModalFormData;


    private SelectStationPage : ActionFormData | undefined;
    private SelectRoutePage : ActionFormData | undefined;


    private TextFiled : string = "";
    private InSelectionType : SelectionType;


    public playersSecondChoices : BetterMap<Player, BlockPos>;

    private playersSelectDatas : number[];

    
	// private static PANELS_START: number = SQUARE_SIZE * 2 + TEXT_FIELD_PADDING;
	private static SLIDER_WIDTH: number = 64;
	private static MAX_TRAINS_PER_HOUR: number = 5;
	private static SECONDS_PER_MC_HOUR: number = Depot.TICKS_PER_HOUR / 20;

    constructor(dataCache: DataCache) {
        this.dataCache = dataCache;
        this.IndexPage = new ActionFormData()
            .title("铁路仪表板")
            .button("车站")
            .button("路线")
            .button("车厂");


        this.UpdateStationPage()

        this.UpdateRoutePage();

        this.UpdateDepotPage();

        this.UpdateSelectStationPage();

        this.CreateDataBasePage = new ModalFormData()
            .title("TITLE")
            .textField("", "名称");

        // 做标记，TITLE是可共用资源，或者是多个东西共用一个界面展示名字

        this.InSelectionType = SelectionType.noSelection;
        this.playersSecondChoices = new BetterMap();
        this.playersSelectDatas = new Array();
    }

    private UpdateStationPage() {
        this.StationPage = new ActionFormData()
            .title("车站")
            .button("新增车站");

        for (const aStation of this.dataCache.stations) {
            console.log(aStation.name);
            
            this.StationPage.button(aStation.name!);
        }
    }

    private ShowStationPage(player : Player) {
        this.UpdateStationPage();
        this.StationPage?.show(player).then((afr) => {
            if (afr.canceled) {
                this.ShowIndexPage(player);
                return
            }

            if (afr.selection == 0) {
                this.ShowCreateStationPage(player);
            }
        });
    }

    private ShowCreateStationPage(player : Player) {
        this.CreateDataBasePage.title("新增车站");
        this.CreateDataBasePage.show(player).then((mofr) => {
            if (mofr.canceled) {
                this.ShowStationPage(player);
                return
            }

            if (mofr.formValues?.[0] == "" || typeof mofr.formValues?.[0] != 'string') {
                player.onScreenDisplay.setActionBar("§c§l名称不能为空")
                this.ShowCreateStationPage(player);
                return
            }
            world.sendMessage(mofr.formValues?.[0]);
            this.InSelectionType = SelectionType.Station;
            this.TextFiled = mofr.formValues?.[0];
            player.onScreenDisplay.setActionBar("§e§l使用仪表板右击包含站台轨道的轨道标记点");
        });
    }



    private UpdateRoutePage() {
        this.RoutePage = new ActionFormData()
            .title("路线")
            .button("新增路线");
        
        for (const aRoute of this.dataCache.routes) {
            this.RoutePage.button(aRoute.name!);
        }
    }

    private ShowRoutePage(player : Player) {
        this.UpdateRoutePage()
        this.RoutePage?.show(player).then((afr) => {
            if (afr.canceled) {
                this.ShowIndexPage(player);
                return
            }

            if (afr.selection == 0) {
                this.ShowCreateRoutePage(player);
            }
        });
    }
   
    private ShowCreateRoutePage(player : Player) {
        this.CreateDataBasePage.title("新增路线");
        this.CreateDataBasePage.show(player).then((mofr) => {
            if (mofr.canceled) {
                this.ShowRoutePage(player);
                return
            }

            if (mofr.formValues?.[0] == "" || typeof mofr.formValues?.[0] != 'string') {
                player.onScreenDisplay.setActionBar("§c§l名称不能为空")
                this.ShowCreateRoutePage(player);
                return
            }
            world.sendMessage(mofr.formValues?.[0]);
            this.TextFiled = mofr.formValues?.[0];
            this.ShowSelectStationPage(player);
        });
    }



    private UpdateDepotPage() {
        this.DepotPage = new ActionFormData()
            .title("车厂")
            .button("新增车厂");
            
        for (const aDepot of this.dataCache.depots) {
            this.DepotPage.button(aDepot.name!);
        }
    }

    private UpdateDepotDepartureTimesEditorPage(depot: Depot) {
        this.DepotDepartureTimesEditorPage = new ModalFormData()
            .title("发车时间表")
            .label("时间表: Minecraft时间")

        for (let index = 0; index < Depot.HOURS_IN_DAY; index++) {
            console.log(index + ": " + depot.getFrequency(index));
            
            this.DepotDepartureTimesEditorPage.slider(
                RailwayDashboard.getTimeString(index) + "                       每小时车辆数",
                0,
                RailwayDashboard.MAX_TRAINS_PER_HOUR * 2,
                { defaultValue: depot.getFrequency(index) }
            )
        }
    }

    private static getTimeString(hour: number): string {
		const hourString: string = String(hour).padStart(2, "0");
		return `${hourString}:00-${hourString}:59`;
	}

    private ShowDepotDepartureTimesEditorPage(player : Player, depot: Depot) {
        this.UpdateDepotDepartureTimesEditorPage(depot)
        this.DepotDepartureTimesEditorPage?.show(player).then((mofr) => {
            if (mofr.canceled) {
                return
            }
            
            // 因为在前面添加了一个label，所以要偏移
            for (let i = 0; i < Depot.HOURS_IN_DAY; i++) {
                depot.setFrequency(mofr.formValues![i + 1] as number, i)
                console.log(i + ": " + (mofr.formValues![i + 1] as number));
            }

            this.ShowDepotEditorPage(player, depot)
        })
    }

    private ShowDepotPage(player : Player) {
        this.UpdateDepotPage()
        this.DepotPage?.show(player).then((afr) => {
            if (afr.canceled) {
                this.ShowIndexPage(player);
                return
            }

            if (afr.selection == 0) {
                this.ShowCreateDepotPage(player);
            }  else if (afr.selection! > 0) {
                const Depot = Array.from(this.dataCache.depots)[afr.selection! - 1];
                this.ShowDepotEditorPage(player, Depot);
            }
        });
    }

    private UpdateDepotEditorPage(depot: Depot) {
        let text: string;
        depot.generateTempDepartures();
        const nextDepartureMillis = depot.getMillisUntilDeploy(1);
        if (nextDepartureMillis >= 0) {
            const hour = TimeUnit.MILLISECONDS.toHours(nextDepartureMillis);
            const minute = TimeUnit.MILLISECONDS.toMinutes(nextDepartureMillis) % 60;
            const second = TimeUnit.MILLISECONDS.toSeconds(nextDepartureMillis) % 60;
            text = "下一班车预计出发时间：" + `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
        } else {
            text = "没有预计班次";
        }

        this.DepotEditorPage = new ActionFormData()
            .title(depot.name!)
            .label(text)
            .button("编辑指令")
            .button("编辑发车时间表");// ModalFormUI的入口
    }

    private ShowDepotEditorPage(player: Player, depot: Depot) {
        this.UpdateDepotEditorPage(depot);

        this.DepotEditorPage!.show(player).then((afr) => {
            if (afr.canceled) {
                this.ShowDepotPage(player);
                return
            }

            if (afr.selection == 0) {
                this.ShowSelectRoutePage(player, depot)
            } else if (afr.selection == 1) {
                this.ShowDepotDepartureTimesEditorPage(player, depot);
            }
        });
        return;
    }

    private UpdateSelectRoutePage(player : Player) {
        this.SelectRoutePage = new ActionFormData()
            .title("选择路线")
            .button("确认");

        for (const aRoute of this.dataCache.routes) {
            this.SelectRoutePage.button(aRoute.name!);
        }
    }

    private ShowSelectRoutePage(player : Player, depot : Depot) {
        this.UpdateSelectRoutePage(player)
        this.SelectRoutePage?.show(player).then((afr) => {
            if (afr.canceled) {
                this.ShowDepotEditorPage(player, depot);
                return;
            }

            if (afr.selection == 0) {
                this.playersSelectDatas.forEach(routeId => depot.routeIds.push(routeId))
                MTS.railwayData.railwayDataPathGenerationMoudle.generatePath(depot.id);
                this.playersSelectDatas.length = 0;
            } else if (afr.selection! > 0) {
                const route = Array.from(this.dataCache.routes)[afr.selection! - 1].id;
                this.playersSelectDatas.push(route!);
                
                console.warn(`调试: 选择路径${route}`);
                return this.ShowSelectRoutePage(player, depot);
            }
        })
    }

    private ShowCreateDepotPage(player : Player) {
        this.CreateDataBasePage.title("新增车厂");
        this.CreateDataBasePage.show(player).then((mofr) => {
            if (mofr.canceled) {
                this.ShowDepotPage(player);
                return
            }

            if (mofr.formValues?.[0] == "" || typeof mofr.formValues?.[0] != 'string') {
                player.onScreenDisplay.setActionBar("§c§l名称不能为空")
                this.ShowCreateDepotPage(player);
                return
            }
            world.sendMessage(mofr.formValues?.[0]);
            this.InSelectionType = SelectionType.Depot;
            this.TextFiled = mofr.formValues?.[0];
            player.onScreenDisplay.setActionBar("§e§l使用仪表板右击包含侧线轨道的轨道标记点");
        });
    }



    private UpdateSelectStationPage() {
        this.SelectStationPage = new ActionFormData()
            .button("确认");

        this.SelectStationPage.button("添加站台");
    }

    private ShowSelectStationPage(player : Player) {
        this.UpdateSelectStationPage()
        this.SelectStationPage?.show(player).then(async (afr) => {
            if (afr.canceled) {
                this.ShowRoutePage(player);
                return
            }

            if (afr.selection === 0) {
                let route = new Route(TransportMode.TRAIN);
                route.name = this.TextFiled;
                this.TextFiled = "";
                
                this.playersSelectDatas.forEach(platformId => route.platformIds.push(new RoutePlatform(platformId)));
                this.playersSelectDatas.length = 0;
                this.dataCache.routes.add(route)
                this.dataCache.sync()
            } else {
                this.IsOnAwait = true;
                const thePlatform = await this.WaitForPlatformSelectResult(player);
                this.IsOnAwait = false;
                this.playersSelectDatas.push(thePlatform.id!);
                return this.ShowSelectStationPage(player);
            }
        });
    }

    private WaitForPlatformSelectResult(player: Player): Promise<Platform>
    {
        return new Promise(async (resolve) => {
            let resultPlatform: Platform | null = null;
            const posToPlatfroms = new BetterMap<BlockPos, Array<Platform>>();
            this.dataCache.platforms.forEach(savedRail => {
                if (this.dataCache.platformIdToStation.has(savedRail.id)) {
                    const pos = savedRail.getMidPos();
                    if (pos.distanceTo(new BlockPos(player.location)) < 64) {
                        if (!posToPlatfroms.has(pos)) {
                            posToPlatfroms.set(pos, new Array())
                        }
                        posToPlatfroms.get(pos)!.push(savedRail);
                    }
                }
            })

            const doSomehingWhilwWaiting = () => {
                resultPlatform = null;

                posToPlatfroms.forEach((savedRails, savedRailPos) => {
                    console.log(Array.from(savedRails, v => v.id), savedRailPos.asJson)
                    const savedRailCount = savedRails.length;
                    for (let i = 0; i < savedRailCount; i++) {
                        const x = savedRailPos.getX() + 0.5;
                        const y = savedRailPos.getY() + 6;
                        const z = savedRailPos.getZ() + (i + 0.5) / savedRailCount;
                        const text = savedRails[i].name;

                        let aColor: RGBA;
                        const IsCollison = CollisionDetector.isPlayerLookingAtOBB(player, {
                            center: { x: x, y: y, z: z },
                            dimensions: {x: 2, y: 2, z: 2},
                            rotation: {x: 0, y: 0}
                        }) && resultPlatform === null
                        if (IsCollison)
                        {
                            aColor = {red: 0, green: 0.9, blue: 0, alpha: 0.8};
                            resultPlatform = savedRails[i];
                        } else {
                            aColor = {red: 0.8, green: 1, blue: 0.8, alpha: 0.5}
                        }

                        ParticleSystem.layNumberlayParticle(
                            Number(text),
                            { x: x + 0.5, y: y, z: z + 0.5 },
                            {x: 0, y: 0, z: 0},
                            {x: 0, y: 0},
                            aColor,
                            2
                        )
                    }
                });
            }

            const intervalId = system.runInterval(() => {
                
                if (PlayerEvents.get(player).itemType == "mts:railway_dashboard" && resultPlatform)
                {
                    console.log("[WaitForPlatformSelectResult] getResult")
                    PlayerEvents.set(player, "itemType", "");
                    system.clearRun(intervalId)
                    resolve(resultPlatform)
                    return;
                }

                doSomehingWhilwWaiting();
            }, 4)// 4tick
        })
    }

    private ShowIndexPage(player : Player) {
        this.IndexPage.show(player).then((afr) => {
            if (afr.selection == 0) {
                this.ShowStationPage(player);
            } else if (afr.selection == 1) {
                this.ShowRoutePage(player);
            } else if (afr.selection == 2) {
                this.ShowDepotPage(player);
            }
        });
    }



    UseDashboard(player : Player) {

        const block = player.getBlockFromViewDirection({ maxDistance: 10 })?.block;

        if (this.InSelectionType != SelectionType.noSelection && !this.playersSecondChoices.has(player) && block) {
            this.playersSecondChoices.set(player, new BlockPos(block.location));
            return;
        }

        let boxSelectionPos1: BlockPos;
        let boxSelectionPos2: BlockPos;

        if (this.InSelectionType != SelectionType.noSelection && this.playersSecondChoices.has(player) && block) {
            boxSelectionPos1 = this.playersSecondChoices.get(player)!;
            boxSelectionPos2 = new BlockPos(block.location);
            this.playersSecondChoices.delete(player);
        }
        
        
        if (this.InSelectionType == SelectionType.Station) {
            const aStation: Station = new Station();
            aStation.name = this.TextFiled;
            console.log("Creat station")
            aStation.setCorners(boxSelectionPos1!.getX(), boxSelectionPos1!.getZ(), boxSelectionPos2!.getX(), boxSelectionPos2!.getZ());
            this.dataCache.stations.add(aStation);
            this.dataCache.sync();

            this.InSelectionType = SelectionType.noSelection;
            this.TextFiled = ''
            this.ShowStationPage(player);
        } else if (this.InSelectionType == SelectionType.Depot) {
            const aDepot : Depot = new Depot(TransportMode.TRAIN);
            aDepot.name = this.TextFiled;
            console.log("Creat depot")
            aDepot.setCorners(boxSelectionPos1!.getX(), boxSelectionPos1!.getZ(), boxSelectionPos2!.getX(), boxSelectionPos2!.getZ());
            this.dataCache.depots.add(aDepot);
            this.dataCache.sync()

            this.InSelectionType = SelectionType.noSelection;
            this.TextFiled = ''
        } else if (this.InSelectionType == SelectionType.noSelection) {
            this.ShowIndexPage(player);
        } else {
            console.error(`[UseDasBoard]`);
        }
    }
}