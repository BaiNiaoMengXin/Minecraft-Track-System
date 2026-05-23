// import { BlockPermutation, Player, world, system, ItemStack, Vector3 } from '@minecraft/server';
// import { gRailNodeManager, gRailwayData } from "../main"
// import { RailAngle } from "../data/RailAngle";
// import { Rail } from "../data/Rail";
// import { Train } from "data/Train";
// import { RailType } from "../data/RailType";
// import { TransportMode } from "../data/TransportMode";
// import { Position, PosHelper, currentTimeMillis, mandatorySetBlock, getBlockDisplayName } from 'data/Base';
// import { HashMap } from '../data/HashMap';
// import { DataCache } from 'data/DataCache';
// import { RailwayData } from 'data/RailwayData';

// export enum BuilderType {
//     Bridge_3,
//     Bridge_5,
//     Bridge_7,
//     Bridge_9
// }

// export class RailBuilder {

//     public playerSelections: HashMap<Player, Position>;

//     private readonly buildBlockType: HashMap<Player, BlockPermutation> = new HashMap();

//     constructor() {
//         this.playerSelections = new HashMap();
//     }

//     async UseItem(player: Player, builderType: BuilderType) {
//         const block = player.getBlockFromViewDirection({ maxDistance: 10 })?.block;

//         if ((!block || block.typeId !== 'mts:rail_node') && player.isSneaking) {
//             if (!block) {
//                 this.setBuildBlockType(player, BlockPermutation.resolve("minecraft:air"));
//                 player.onScreenDisplay.setActionBar(`§l切换构建方块为: 空气`);
//                 return;
//             } else {
//                 this.setBuildBlockType(player, block.permutation);
//                 player.onScreenDisplay.setActionBar({
//                     rawtext: [
//                         { text: "§l切换构建方块为: " },
//                         getBlockDisplayName(block.permutation)
//                     ]
//                 });
//                 return;
//             }
//         }
        
//         if (!block || block.typeId !== 'mts:rail_node') {
//             player.sendMessage('§c[MTS] Please look at a rail node');
//             return;
//         }

//         const location = block.location;

//         if (!gRailNodeManager.getNode(location)) {
//             player.onScreenDisplay.setActionBar("§c§l未找到节点数据");
//             return;
//         }

//         if (this.playerSelections.has(player)) {
//             const rail = this.getRail(location, this.playerSelections.get(player)!);
//             if (!rail) {
//                 player.onScreenDisplay.setActionBar("§c§l未找到轨道数据");
//                 this.playerSelections.delete(player);
//                 return;
//             }

//             const blockType = this.getBuildBlockType(player)
//             if (builderType === BuilderType.Bridge_3) {
//                 await RailBuilder.createBridge(player, rail, blockType, 3);
//             } else if (builderType === BuilderType.Bridge_5) {
//                 await RailBuilder.createBridge(player, rail, blockType, 5);
//             } else if (builderType === BuilderType.Bridge_7) {
//                 await RailBuilder.createBridge(player, rail, blockType, 7);
//             } else if (builderType === BuilderType.Bridge_9) {
//                 await RailBuilder.createBridge(player, rail, blockType, 9);
//             }

//             this.playerSelections.delete(player);
//         } else {
//             this.playerSelections.set(player, location);
//             return;
//         }
//     }

//     getBuildBlockType(player: Player): BlockPermutation {
//         if (!this.buildBlockType.has(player))
//             this.buildBlockType.set(player, BlockPermutation.resolve("minecraft:air"))

//         return this.buildBlockType.get(player)!;
//     }

//     setBuildBlockType(player: Player, blockPermutation: BlockPermutation): void {
//         this.buildBlockType.set(player, blockPermutation)
//     }

//     // /**
//     //  * 创建桥梁方块 - 单函数异步版本
//     //  * @param rail 轨道类
//     //  * @param coolDown 冷却时间(ms)，默认10
//     //  * @param width 桥梁宽度，默认5
//     //  * @param blockType 方块类型ID
//     //  */
//     // private static createBridge(
//     //     rail: Rail, 
//     //     blockType: BlockPermutation,
//     //     width: number, 
//     //     coolDown: number = 1000000
//     // ): void {
//     //     function isValidBlockPosition(position: Position, tolerance: number = 0.99): boolean {
//     //         const { x, y, z } = position;
            
//     //         // 计算到最近网格点的距离
//     //         const distX = Math.abs(x - Math.round(x));
//     //         const distY = Math.abs(y - Math.round(y));
//     //         const distZ = Math.abs(z - Math.round(z));
            
//     //         // 检查是否足够接近整数网格点
//     //         return distX <= tolerance && distY <= tolerance && distZ <= tolerance;
//     //     }



//     //     if (!rail.goodRadius || !rail.isValid) {
//     //         return;
//     //     }

//     //     const STEP = 0.5;
//     //     const Y_OFFSET = 0.99;
//     //     const TOLERANCE_WIDTH = 0.1;
        
//     //     if (width < 1) width = 1;
//     //     const railLength = rail.getLength();
//     //     const extendWidth = width / 2;
        
//     //     // 异步处理变量
//     //     let currentIndex = 0;
//     //     const samplesPerTick = Math.max(1, Math.floor(20 / (coolDown / 50)));
        
//     //     // 使用MCBE的runInterval实现异步
//     //     const intervalId = system.runInterval(() => {
//     //         const startTime = Date.now();
//     //         let processed = 0;
            
//     //         // 单tick内处理多个样本
//     //         while (currentIndex < Math.ceil(railLength) && processed < samplesPerTick) {
//     //             if (Date.now() - startTime > 45) break; // 单tick不超过45ms
                
//     //             const position = rail.getPosition(currentIndex);
//     //             const angle = rail.getAngleAtPosition(currentIndex).y + 90;
                
//     //             // 放置中心方块（轨道下方）
//     //             const centerPos = { x: position.x, y: position.y - Y_OFFSET, z: position.z };
//     //             try {
//     //                 if (world.getDimension("overworld").getBlock({x: Math.floor(centerPos.x), y: Math.floor(centerPos.y), z: Math.floor(centerPos.z)})?.typeId != "mts:rail_node" &&
//     //                     isValidBlockPosition(centerPos)) {
//     //                     world.getDimension("overworld").setBlockPermutation(centerPos, blockType);
//     //                     // world.sendMessage("放1")
//     //                 }
//     //             } catch (e) {}
                
//     //             for (let side = -extendWidth + TOLERANCE_WIDTH; side < extendWidth - TOLERANCE_WIDTH; side += STEP) {
//     //                 if (side === 0) continue;
                    
//     //                 const angleRad = angle * Math.PI / 180;
//     //                 const perpAngle = angleRad + Math.PI / 2;
//     //                 const sidePos = {
//     //                     x: position.x + Math.cos(perpAngle) * side,
//     //                     y: position.y - Y_OFFSET,
//     //                     z: position.z + Math.sin(perpAngle) * side
//     //                 };
                    
//     //                 try {
//     //                     if (world.getDimension("overworld").getBlock({x: Math.floor(sidePos.x), y: Math.floor(sidePos.y), z: Math.floor(sidePos.z)})?.typeId != "mts:rail_node" &&
//     //                         isValidBlockPosition(sidePos)) {
//     //                         world.getDimension("overworld").setBlockPermutation(sidePos, blockType);
//     //                         // world.sendMessage("放2")
//     //                     }
//     //                 } catch (e) {}
//     //             }
                
//     //             currentIndex += STEP;
//     //             processed++;
//     //         }
            
//     //         // 完成时自动回收
//     //         if (currentIndex >= railLength) {
//     //             system.clearRun(intervalId);
//     //         }
//     //     });
//     // }

//     private getNode(location: Position) {
//         return gRailNodeManager.getNode(location);
//     }



//     /**
//      * 创建桥梁方块 - 单函数异步版本
//      * @param player 谁构建的轨道
//      * @param rail 轨道类
//      * @param width 桥梁宽度
//      * @param blockType 方块类型ID
//      */
//     private static createBridge(
//         player: Player | null,
//         rail: Rail, 
//         blockType: BlockPermutation,
//         width: number, 
//     ): Promise<boolean> {
//         // const blacklistedPos: Set<Vector3> = new Set()
//         return new Promise(async (resolve) => {

//             const blacklistedPos: Set<string> = new Set()
//             this.distance = 0;

//             const intervalId = system.runInterval(() => {
//                 const result = this.create(false, editPos => {
//                     const pos = RailwayData.newBlockPos(editPos);
//                     const isTopHalf = editPos.y - Math.floor(editPos.y) >= 0.5;
//                     blacklistedPos.add(PosHelper.PosToStr(RailBuilder.getHalfPos(pos, isTopHalf)));

//                     let placePos: BlockPos;
//                     let placeState: BlockPermutation;
//                     let placeHalf: boolean;

//                     // if (isSlab && isTopHalf) {
//                     //     placePos = pos;
//                     //     placeState = state.setValue(SlabBlock.TYPE, SlabType.BOTTOM);
//                     //     placeHalf = false;
//                     // } else {
//                         placePos = pos.offset(0, -1, 0);
//                         placeState = /*isSlab ? state.setValue(SlabBlock.TYPE, SlabType.TOP) : */blockType;
//                         placeHalf = true;
//                     // }

//                     if (placePos != pos && RailBuilder.canPlace(pos)) {
//                         mandatorySetBlock("overworld", pos, BlockPermutation.resolve("minecraft:air"));
//                     }
//                     if (!blacklistedPos.has(PosHelper.PosToStr(RailBuilder.getHalfPos(placePos, placeHalf))) && RailBuilder.canPlace(placePos)) {
//                         mandatorySetBlock("overworld", placePos, placeState);
//                     }
//                 }, rail, width / 2, 0, (percentage) => {
//                     if (player) {
//                         player.onScreenDisplay.setActionBar(`桥梁建造中 （${percentage}%）`)
//                     }
//                 })

//                 if (result) {
//                     resolve(true);
//                     system.clearRun(intervalId) // 必须回收循环线程
//                     return;
//                 }
//             }, 0)
//         })
//     }

// 	private static INCREMENT: number = 0.2;
    
//     private static distance = 0;

//     private static create(includeMiddle: boolean, consumer: (arg1: Vector3) => void, rail: Rail, radius: number, height: number, showProgressMessage: (arg: number) => void): boolean {
//         const length = rail.getLength()

//         const startTime = currentTimeMillis();

//         // 此处MTR是在2毫秒内重复执行，此处为提生性能，缩减重复逻辑
//         for (let i = 0; i < 2; i++) {
//             const pos1 = rail.getPosition(this.distance);
//             this.distance += RailBuilder.INCREMENT;
//             const pos2 = rail.getPosition(this.distance);
//             const vec3 = new Vec3(pos2.x - pos1.x, 0, pos2.z - pos1.z).normalize().yRot(Math.PI / 2);

//             for (let x = -radius; x <= radius; x += RailBuilder.INCREMENT) {
//                 const editPos: Vector3 = Pos.offset(os1, vec3.multiply_(x, 0, x));
//                 const wholeNumber: boolean = Math.floor(editPos.y) == Math.ceil(editPos.y);
//                 if (includeMiddle || Math.abs(x) > radius - RailBuilder.INCREMENT) {
//                     for (let y = 0; y <= height; y++) {
//                         if (y < height || !wholeNumber) {
//                             consumer(editPos.offset(0, y, 0));
//                         }
//                     }
//                 } else {
//                     consumer(editPos.offset(0, Math.max(0, wholeNumber ? height - 1 : height), 0));
//                 }
//             }

//             if (length - this.distance < RailBuilder.INCREMENT) {
//                 showProgressMessage(100);
//                 return true;
//             }
//         }

//         showProgressMessage(RailwayData.round(100 * this.distance / length, 1));
//         return false;
//     }

//     private static canPlace(pos: BlockPos) {
//         return world.getDimension("overworld").getBlock(RailwayData.newBlockPos_(pos))?.typeId != "mts:rail_node";
//     }

//     private static getHalfPos(pos: Vector3, isTopHalf: boolean): Vector3 {
//         return RailwayData.newBlockPos(pos.x, pos.y * 2 + (isTopHalf ? 1 : 0), pos.z);
//     }
// }
