import { Rail } from "data/Rail";
import { RailType } from "data/RailType";
import { RailAngle } from "data/RailAngle";
import { TransportMode } from "data/TransportMode";
import { SavedRailBase } from "data/SavedRailBase";
import { PathData } from "./PathData";
import { DataCache } from "data/DataCache";
import { BetterMap } from "../data/BetterMap";
import { BlockPos } from "util/math/BlockPos";
import { RailwayData } from "data/RailwayData";
import { Vec3 } from "util/math/Vec3";

// 路径查找模块 - 用于在铁路/跑道网络中查找路径
// 路径查找器类
export class PathFinder {
    // 飞机最大转弯弧长常量
    private static readonly MAX_AIRPLANE_TURN_ARC = 128;


    static LOG(a: string) {
        // console.warn(a)
    }
    /**
     * 查找完整路径
     * @param path 存储结果的路径列表
     * @param rails 铁路数据映射
     * @param savedRailBases 保存的铁路基础数据
     * @param stopIndexOffset 站点索引偏移量
     * @param cruisingAltitude 巡航高度（飞机用）
     * @param useFastSpeed 是否使用快速速度
     * @returns 成功处理的站点数量
     */
    public static findPath(
        path: PathData[],
        rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>,
        savedRailBases: SavedRailBase[],
        stopIndexOffset: number,
        cruisingAltitude: number,
        useFastSpeed: boolean
    ): number {
        PathFinder.LOG(`[PathFinder.findPath] 开始查找完整路径，站点数量: ${savedRailBases.length}, 停止索引偏移: ${stopIndexOffset}`);
        
        let i = 0
        for (const element of savedRailBases) {
            i += 1
        }
        // 清空路径结果
        path.length = 0;
        PathFinder.LOG(`[PathFinder.findPath] 已清空路径结果`);
        
        // 如果站点数量不足2个，无法形成路径
        if (savedRailBases.length < 2) {
            PathFinder.LOG(`[PathFinder.findPath] 站点数量不足2个，无法形成路径，返回0`);
            return 0;
        }

        PathFinder.LOG(`[PathFinder.findPath] 开始遍历每对相邻站点，总共 ${savedRailBases.length - 1} 对`);

        // 遍历每对相邻站点
        for (let i = 0; i < savedRailBases.length - 1; i++) {
            PathFinder.LOG(`[PathFinder.findPath] 处理第 ${i} 对站点: ${i} -> ${i + 1}`);
            
            const savedRailBaseStart = savedRailBases[i];
            const savedRailBaseEnd = savedRailBases[i + 1];

            PathFinder.LOG(`[PathFinder.findPath] 起始站点ID: ${savedRailBaseStart.id}, 结束站点ID: ${savedRailBaseEnd.id}, 运输模式: ${savedRailBaseStart.transportMode}`);

            // 如果是飞机模式，收集跑道数据
            const runways = new Set<BlockPos>();
            if (savedRailBaseStart.transportMode == TransportMode.AIRPLANE) {
                PathFinder.LOG(`[PathFinder.findPath] 检测到飞机模式，开始收集跑道数据`);
                rails.forEach((railMap, startPos) => {
                    // 查找只有一个连接且类型为跑道的铁路
                    if (railMap.size == 1 && 
                        Array.from(railMap.values()).every(rail => rail.railType == RailType.RUNWAY)) {
                        PathFinder.LOG(`[PathFinder.findPath] 找到跑道位置: ${JSON.stringify(startPos)}`);
                        runways.add(startPos);
                    }
                });
                PathFinder.LOG(`[PathFinder.findPath] 总共找到 ${runways.size} 条跑道`);
            }

            // 查找两个站点间的部分路径
            PathFinder.LOG(`[PathFinder.findPath] 开始查找部分路径 ${i} -> ${i + 1}`);
            const partialPath = PathFinder.findPartialPath(
                rails, 
                runways, 
                savedRailBaseStart, 
                savedRailBaseEnd, 
                i + stopIndexOffset, 
                cruisingAltitude, 
                useFastSpeed
            );

            PathFinder.LOG(`[PathFinder.findPath] 部分路径查找完成，找到 ${partialPath.length} 段路径`);

            // 如果部分路径查找失败，清空结果并返回失败位置
            if (partialPath.length == 0) {
                PathFinder.LOG(`[PathFinder.findPath] 部分路径查找失败，清空结果并返回失败位置: ${i + 1}`);
                path.length = 0;
                return i + 1;
            }

            // 将部分路径添加到总路径中
            PathFinder.LOG(`[PathFinder.findPath] 将部分路径添加到总路径中`);
            PathFinder.appendPath(path, partialPath);
            PathFinder.LOG(`[PathFinder.findPath] 当前总路径长度: ${path.length}`);
        }

        PathFinder.LOG(`[PathFinder.findPath] 完整路径查找成功，总共处理 ${savedRailBases.length} 个站点，路径长度: ${path.length}`);
        // 返回成功处理的站点数量
        return savedRailBases.length;
    }

    /**
     * 将部分路径追加到主路径中
     * @param path 主路径
     * @param partialPath 要追加的部分路径
     */
    public static appendPath(path: PathData[], partialPath: PathData[]): void {
        PathFinder.LOG(`[PathFinder.appendPath] 开始追加路径，主路径长度: ${path.length}, 部分路径长度: ${partialPath.length}`);
        
        if (partialPath.length == 0) {
            // 如果部分路径为空，清空主路径
            PathFinder.LOG(`[PathFinder.appendPath] 部分路径为空，清空主路径`);
            path.length = 0;
        } else {
            // 检查是否需要合并重复的铁路段
            const sameFirstRail = path.length > 0 && 
                path[path.length - 1].isSameRail(partialPath[0]);
            
            PathFinder.LOG(`[PathFinder.appendPath] 检查重复铁路段: ${sameFirstRail}`);

            // 遍历部分路径并添加
            for (let j = 0; j < partialPath.length; j++) {
                if (!(j == 0 && sameFirstRail)) {
                    PathFinder.LOG(`[PathFinder.appendPath] 添加第 ${j} 段路径到主路径`);
                    path.push(partialPath[j]);
                } else {
                    PathFinder.LOG(`[PathFinder.appendPath] 跳过第 ${j} 段路径（重复铁路段）`);
                }
            }
            
            PathFinder.LOG(`[PathFinder.appendPath] 追加完成，主路径长度: ${path.length}`);
        }
    }

    /**
     * 查找两个站点间的部分路径
     */
    private static findPartialPath(
        rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>,
        runways: Set<BlockPos>,
        savedRailBaseStart: SavedRailBase,
        savedRailBaseEnd: SavedRailBase,
        stopIndex: number,
        cruisingAltitude: number,
        useFastSpeed: boolean
    ): PathData[] {
        PathFinder.LOG(`[PathFinder.findPartialPath] 开始查找部分路径，停止索引: ${stopIndex}`);
        PathFinder.LOG(`[PathFinder.findPartialPath] 起始站点ID: ${savedRailBaseStart.id}, 结束站点ID: ${savedRailBaseEnd.id}`);

        // 获取目标站点的中间位置
        const savedRailBaseEndMidPos = savedRailBaseEnd.getMidPos();
        PathFinder.LOG(`[PathFinder.findPartialPath] 目标站点中间位置: ${JSON.stringify(savedRailBaseEndMidPos)}`);

        // 创建比较器函数，用于排序连接选项
        const comparator = (newConnections: BetterMap<BlockPos, Rail>): ((pos1: BlockPos, pos2: BlockPos) => number) => {
            PathFinder.LOG(`[PathFinder.findPartialPath] 创建连接比较器`);
            return (pos1, pos2) => {
                if (pos1.equals(pos2)) {
                    PathFinder.LOG(`[PathFinder.findPartialPath.comparator] 位置相同，返回0`);
                    return 0;
                } else {
                    const connection1 = newConnections.get(pos1);
                    const connection2 = newConnections.get(pos2);
                    
                    PathFinder.LOG(`[PathFinder.findPartialPath.comparator] 比较位置 ${JSON.stringify(pos1)} 和 ${JSON.stringify(pos2)}`);
                    PathFinder.LOG(`[PathFinder.findPartialPath.comparator] 连接1: ${JSON.stringify(connection1?.railType)}, 连接2: ${JSON.stringify(connection2?.railType)}`);
                    
                    // 如果连接为空或速度限制相同，按距离排序
                    if (!connection1 || !connection2 || 
                        connection1.railType.speedLimit == connection2.railType.speedLimit) {
                        const dist1 = pos1.distSqr(savedRailBaseEndMidPos);
                        const dist2 = pos2.distSqr(savedRailBaseEndMidPos);
                        PathFinder.LOG(`[PathFinder.findPartialPath.comparator] 按距离排序: ${dist1} vs ${dist2}`);
                        return dist1 > dist2 ? 1 : -1;
                    } else {
                        // 按速度限制降序排序
                        PathFinder.LOG(`[PathFinder.findPartialPath.comparator] 按速度限制排序: ${connection1.railType.speedLimit} vs ${connection2.railType.speedLimit}`);
                        return connection2.railType.speedLimit - connection1.railType.speedLimit;
                    }
                }
            };
        };

        PathFinder.LOG(`[PathFinder.findPartialPath] 开始尝试两个方向查找路径`);

        // 尝试两个方向（正向和反向）
        for (let i = 0; i < 2; i++) {
            PathFinder.LOG(`[PathFinder.findPartialPath] 尝试第 ${i + 1} 个方向`);
            
            const path: PathPart[] = [];
            const turnBacks = new Set<BlockPos>();
            
            // 获取起始位置的有序列表
            const startVec3s = savedRailBaseStart.getOrderedPositions(savedRailBaseEndMidPos, i == 0);
            PathFinder.LOG(`[PathFinder.findPartialPath] 获取到起始位置: ${startVec3s.length} 个`);
            
            // 添加起始路径部分
            path.push(new PathPart(null, startVec3s[0], []));
            PathFinder.LOG(`[PathFinder.findPartialPath] 添加起始路径部分: ${JSON.stringify(startVec3s[0])}`);
            
            // 添加第一个连接
            PathFinder.LOG(`[PathFinder.findPartialPath] 添加第一个连接: ${JSON.stringify(startVec3s[1])} <- ${JSON.stringify(startVec3s[0])}`);
            PathFinder.addPathPart(
                rails, 
                runways, 
                startVec3s[1], 
                startVec3s[0], 
                path, 
                turnBacks, 
                comparator
            );

            PathFinder.LOG(`[PathFinder.findPartialPath] 当前路径长度: ${path.length}`);
            PathFinder.LOG(`[PathFinder.findPartialPath] 开始路径查找循环`);

            // 路径查找循环
            while (path.length >= 2) {
                PathFinder.LOG(`[PathFinder.findPartialPath] 路径查找循环，当前路径深度: ${path.length}`);
                
                const lastPathPart = path[path.length - 1];
                PathFinder.LOG(`[PathFinder.findPartialPath] 最后路径部分位置: ${JSON.stringify(lastPathPart.pos)}, 剩余选项: ${lastPathPart.otherOptions.length}`);

                // 如果没有其他选项，回溯
                if (lastPathPart.otherOptions.length == 0) {
                    PathFinder.LOG(`[PathFinder.findPartialPath] 没有其他选项，开始回溯`);
                    path.pop();
                    PathFinder.LOG(`[PathFinder.findPartialPath] 回溯后路径长度: ${path.length}`);
                } else {
                    // 尝试下一个选项
                    const newPos = lastPathPart.otherOptions.shift()!;
                    PathFinder.LOG(`[PathFinder.findPartialPath] 尝试下一个选项: ${JSON.stringify(newPos)}`);
                    
                    PathFinder.addPathPart(rails, runways, newPos, lastPathPart.pos, path, turnBacks, comparator);
                    PathFinder.LOG(`[PathFinder.findPartialPath] 添加路径部分后路径长度: ${path.length}`);

                    // 检查是否到达目标站点
                    if (savedRailBaseEnd.containsPos(newPos)) {
                        PathFinder.LOG(`[PathFinder.findPartialPath] 到达目标站点位置: ${JSON.stringify(newPos)}`);
                        const railPath: PathData[] = [];
                        
                        PathFinder.LOG(`[PathFinder.findPartialPath] 开始构建路径数据，路径段数: ${path.length - 1}`);
                        
                        // 构建路径数据
                        for (let j = 0; j < path.length - 1; j++) {
                            PathFinder.LOG(`[PathFinder.findPartialPath] 处理第 ${j} 段路径`);
                            
                            const pathPart1 = path[j];
                            const pathPart2 = path[j + 1];
                            const pos1 = pathPart1.pos;
                            const pos2 = pathPart2.pos;
                            
                            PathFinder.LOG(`[PathFinder.findPartialPath] 位置对: ${JSON.stringify(pos1)} -> ${JSON.stringify(pos2)}`);
                            
                            const rail = DataCache.tryGet(rails, pos1, pos2)!;
                            PathFinder.LOG(`[PathFinder.findPartialPath] 获取铁路数据: ${rail ? JSON.stringify(rail.railType) : 'null'}`);

                            if (rail == null) {
                                PathFinder.LOG(`[PathFinder.findPartialPath] 铁路数据为空，处理飞机路径`);
                                // 处理飞机路径（无实际铁路连接时）
                                if (runways.size == 0) {
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 没有跑道数据，返回空路径`);
                                    return [];
                                } else {
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 开始计算飞机路径`);
                                    // 计算高度差和巡航位置
                                    const heightDifference1 = cruisingAltitude - pos1.getY();
                                    const heightDifference2 = cruisingAltitude - pos2.getY();
                                    
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 高度差1: ${heightDifference1}, 高度差2: ${heightDifference2}`);
                                    
                                    const cruisingPos1 = RailwayData.offsetBlockPos(
                                        pos1, 
                                        pathPart1.direction!.cos * Math.abs(heightDifference1) * 4, 
                                        heightDifference1, 
                                        pathPart1.direction!.sin * Math.abs(heightDifference1) * 4
                                    );
                                    
                                    const cruisingPos4 = RailwayData.offsetBlockPos(
                                        pos2, 
                                        -pathPart2.direction!.cos * Math.abs(heightDifference2) * 4, 
                                        heightDifference2, 
                                        -pathPart2.direction!.sin * Math.abs(heightDifference2) * 4
                                    );

                                    PathFinder.LOG(`[PathFinder.findPartialPath] 巡航位置1: ${cruisingPos1}, 巡航位置4: ${cruisingPos4}`);

                                    // 计算转弯弧长
                                    const turnArc = Math.min(
                                        PathFinder.MAX_AIRPLANE_TURN_ARC, 
                                        cruisingPos1.distManhattan(cruisingPos4) / 8
                                    );
                                    
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 转弯弧长: ${turnArc}`);

                                    // 选择虚拟铁路类型
                                    const dummyRailType = useFastSpeed ? RailType.AIRPLANE_DUMMY : RailType.RUNWAY;
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 虚拟铁路类型: ${JSON.stringify(dummyRailType)}`);

                                    // 添加起飞段路径
                                    const takeoffPath = new PathData(
                                        new Rail(
                                            pos1, 
                                            pathPart1.direction!, 
                                            cruisingPos1, 
                                            pathPart1.direction!.getOpposite(), 
                                            dummyRailType, 
                                            TransportMode.AIRPLANE
                                        ), 
                                        0, 0, pos1, cruisingPos1, stopIndex
                                    );
                                    railPath.push(takeoffPath);
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 添加起飞段路径`);

                                    // 计算预期角度
                                    const expectedAngle = RailAngle.fromAngle(
                                        Math.atan2(
                                            cruisingPos4.getZ() - cruisingPos1.getZ(), 
                                            cruisingPos4.getX() - cruisingPos1.getX()
                                        ) * 180 / Math.PI
                                    );
                                    
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 预期角度: ${JSON.stringify(expectedAngle)}`);

                                    // 添加转弯路径
                                    const tempRailData: PathData[] = [];
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 开始添加飞机转弯路径`);
                                    
                                    const cruisingPos2 = PathFinder.addAirplanePath(
                                        pathPart1.direction!, 
                                        cruisingPos1, 
                                        expectedAngle, 
                                        turnArc, 
                                        tempRailData, 
                                        dummyRailType, 
                                        stopIndex, 
                                        false
                                    );
                                    
                                    const cruisingPos3 = PathFinder.addAirplanePath(
                                        pathPart2.direction!.getOpposite(), 
                                        cruisingPos4, 
                                        expectedAngle.getOpposite(), 
                                        turnArc, 
                                        tempRailData, 
                                        dummyRailType, 
                                        stopIndex, 
                                        true
                                    );

                                    PathFinder.LOG(`[PathFinder.findPartialPath] 转弯路径添加完成，临时路径长度: ${tempRailData.length}`);

                                    // 添加巡航段路径
                                    const cruisePath = new PathData(
                                        new Rail(
                                            cruisingPos2, 
                                            expectedAngle, 
                                            cruisingPos3, 
                                            expectedAngle.getOpposite(), 
                                            dummyRailType, 
                                            TransportMode.AIRPLANE
                                        ), 
                                        0, 0, cruisingPos2, cruisingPos3, stopIndex
                                    );
                                    railPath.push(cruisePath);
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 添加巡航段路径`);
                                    
                                    // 添加转弯路径数据
                                    railPath.push(...tempRailData);
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 添加转弯路径，当前总路径长度: ${railPath.length}`);

                                    // 添加降落段路径
                                    const landingPath = new PathData(
                                        new Rail(
                                            cruisingPos4, 
                                            pathPart2.direction!, 
                                            pos2, 
                                            pathPart2.direction!.getOpposite(), 
                                            dummyRailType, 
                                            TransportMode.AIRPLANE
                                        ), 
                                        0, 0, cruisingPos4, pos2, stopIndex
                                    );
                                    railPath.push(landingPath);
                                    PathFinder.LOG(`[PathFinder.findPartialPath] 添加降落段路径`);
                                }
                            } else {
                                PathFinder.LOG(`[PathFinder.findPartialPath] 处理普通铁路路径`);
                                // 处理普通铁路路径
                                const turningBack = rail.railType == RailType.TURN_BACK && 
                                    j < path.length - 2 && 
                                    path[j + 2].pos.equals(pos1);
                                
                                PathFinder.LOG(`[PathFinder.findPartialPath] 是否掉头: ${turningBack}`);
                                
                                const railPathData = new PathData(
                                    rail, 
                                    j == 0 ? savedRailBaseStart.id! : 0, 
                                    turningBack ? 1 : 0, 
                                    pos1, 
                                    pos2, 
                                    stopIndex
                                );
                                railPath.push(railPathData);
                                PathFinder.LOG(`[PathFinder.findPartialPath] 添加普通铁路路径段`);
                            }
                        }

                        PathFinder.LOG(`[PathFinder.findPartialPath] 路径构建完成，开始添加最终连接`);
                        
                        // 添加最终连接到目标站点的路径
                        const endPos = savedRailBaseEnd.getOtherPosition(newPos);
                        PathFinder.LOG(`[PathFinder.findPartialPath] 最终连接位置: ${JSON.stringify(newPos)} -> ${JSON.stringify(endPos)}`);
                        
                        const finalRail = DataCache.tryGet(rails, newPos, endPos)!;
                        PathFinder.LOG(`[PathFinder.findPartialPath] 最终铁路数据: ${finalRail ? JSON.stringify(finalRail.railType) : 'null'}`);
                        
                        if (finalRail == null) {
                            PathFinder.LOG(`[PathFinder.findPartialPath] 最终铁路数据为空，返回空路径`);
                            return [];
                        } else {
                            // 添加最终路径段
                            const dwellTime = savedRailBaseEnd instanceof SavedRailBase ? 
                                savedRailBaseEnd.getDwellTime() : 0;
                            
                            PathFinder.LOG(`[PathFinder.findPartialPath] 停留时间: ${dwellTime}`);
                            
                            const finalPathData = new PathData(
                                finalRail, 
                                savedRailBaseEnd.id!, 
                                dwellTime, 
                                newPos, 
                                endPos, 
                                stopIndex + 1
                            );
                            railPath.push(finalPathData);
                            
                            PathFinder.LOG(`[PathFinder.findPartialPath] 部分路径查找成功，总路径段数: ${railPath.length}`);
                            return railPath;
                        }
                    }
                }
            }
            
            PathFinder.LOG(`[PathFinder.findPartialPath] 第 ${i + 1} 个方向查找失败`);
        }

        PathFinder.LOG(`[PathFinder.findPartialPath] 所有方向查找失败，返回空路径`);
        return [];
    }

    /**
     * 添加路径部分到路径中
     */
    private static addPathPart(
        rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>,
        runways: Set<BlockPos>,
        newPos: BlockPos,
        lastPos: BlockPos,
        path: PathPart[],
        turnBacks: Set<BlockPos>,
        comparator: (newConnections: BetterMap<BlockPos, Rail>) => (pos1: BlockPos, pos2: BlockPos) => number
    ): void {
        PathFinder.LOG(`[PathFinder.addPathPart] 开始添加路径部分: ${JSON.stringify(lastPos)} -> ${JSON.stringify(newPos)}`);
        
        // 获取新位置的连接
        const newConnections = rails.get(newPos);
        const oldRail = rails.get(lastPos)?.get(newPos);

        PathFinder.LOG(`[PathFinder.addPathPart] 新位置连接数量: ${newConnections?.size || 0}`);
        PathFinder.LOG(`[PathFinder.addPathPart] 旧铁路数据: ${oldRail ? JSON.stringify(oldRail.railType) : 'null'}`);

        // 如果没有旧铁路且没有跑道，直接返回
        if (oldRail == null && runways.size == 0) {
            PathFinder.LOG(`[PathFinder.addPathPart] 没有旧铁路且没有跑道，直接返回`);
            let index = 0
            rails.forEach((railmap, pos1) => {
                railmap.forEach((rail, pos2) => {
                    index += 1
                });
            });
            return;
        }

        // 确定新方向
        const newDirection = oldRail == null ? 
            (newConnections ? Array.from(newConnections.values())[0]?.facingStart : RailAngle.E) : 
            oldRail!.facingEnd.getOpposite();
        
        PathFinder.LOG(`[PathFinder.addPathPart] 新方向: ${JSON.stringify(newDirection)}`);
        
        const otherOptions: BlockPos[] = [];

        if (newConnections) {
            // 检查是否可以掉头
            const canTurnBack = oldRail !== null && 
                oldRail!.railType == RailType.TURN_BACK && 
                !turnBacks.has(newPos);
            
            PathFinder.LOG(`[PathFinder.addPathPart] 是否可以掉头: ${canTurnBack}`);

            // 处理跑道特殊情况
            if (oldRail !== null && oldRail!.railType == RailType.RUNWAY && newConnections.size <= 1) {
                PathFinder.LOG(`[PathFinder.addPathPart] 处理跑道特殊情况`);
                otherOptions.push(...Array.from(runways));
                PathFinder.LOG(`[PathFinder.addPathPart] 添加跑道选项: ${runways.size} 个`);
            } else {
                PathFinder.LOG(`[PathFinder.addPathPart] 处理普通连接选项`);
                // 遍历所有连接选项
                newConnections.forEach((rail, connectedPos) => {
                    PathFinder.LOG(`[PathFinder.addPathPart] 检查连接选项: ${JSON.stringify(connectedPos)}, 铁路类型: ${JSON.stringify(rail.railType)}`);
                    
                    // 新增：检查是否是刚走过的反向路径
                    const isBacktrack = path.length >= 2 && 
                        path[path.length - 2].pos.equals(connectedPos);
                    
                    if (isBacktrack) {
                        PathFinder.LOG(`[PathFinder.addPathPart] 跳过反向路径: ${JSON.stringify(connectedPos)}`);
                        return; // 跳过这个选项
    }
    
                    if (canTurnBack || 
                        (rail.railType !== RailType.NONE && 
                            rail.facingStart !== newDirection.getOpposite() && 
                            !path.some(pathPart => pathPart.isSame(newPos, newDirection)))) {
                        
                        PathFinder.LOG(`[PathFinder.addPathPart] 添加有效连接选项: ${JSON.stringify(connectedPos)}`);
                        PathFinder.LOG(`[PathFinder.addPathPart] DEBUG- Star: ${JSON.stringify(rail.facingStart)}, ${JSON.stringify(newDirection.getOpposite())}`)
                        otherOptions.push(connectedPos);
                        if (canTurnBack) {
                            PathFinder.LOG(`[PathFinder.addPathPart] 标记掉头位置: ${JSON.stringify(newPos)}`);
                            turnBacks.add(newPos);
                        }
                    } else {
                        PathFinder.LOG(`[PathFinder.addPathPart] 跳过无效连接选项: ${JSON.stringify(connectedPos)}`);
                    }
                });
            }
        }

        PathFinder.LOG(`[PathFinder.addPathPart] 总共找到 ${otherOptions.length} 个可选连接`);

        // 如果有可选连接，排序并添加到路径
        if (otherOptions.length > 0) {
            PathFinder.LOG(`[PathFinder.addPathPart] 开始排序可选连接`);
            otherOptions.sort(comparator(newConnections!));
            PathFinder.LOG(`[PathFinder.addPathPart] 排序完成，添加路径部分`);
            path.push(new PathPart(newDirection, newPos, otherOptions));
            PathFinder.LOG(`[PathFinder.addPathPart] 当前路径长度: ${path.length}`);
        } else {
            PathFinder.LOG(`[PathFinder.addPathPart] 没有可选连接，不添加路径部分`);
        }
    }

    /**
     * 添加飞机转弯路径
     */
    private static addAirplanePath(
        startAngle: RailAngle,
        startPos: BlockPos,
        expectedAngle: RailAngle,
        turnArc: number,
        tempRailPath: PathData[],
        railType: RailType,
        stopIndex: number,
        reverse: boolean
    ): BlockPos {
        PathFinder.LOG(`[PathFinder.addAirplanePath] 开始添加飞机转弯路径，反向: ${reverse}`);
        PathFinder.LOG(`[PathFinder.addAirplanePath] 起始角度: ${JSON.stringify(startAngle)}, 预期角度: ${JSON.stringify(expectedAngle)}`);
        PathFinder.LOG(`[PathFinder.addAirplanePath] 起始位置: ${JSON.stringify(startPos)}, 转弯弧长: ${turnArc}`);
        
        // 计算角度差
        const angleDifference = expectedAngle.sub(startAngle);
        const turnRight = angleDifference.angleRadians > 0;
        
        PathFinder.LOG(`[PathFinder.addAirplanePath] 角度差: ${JSON.stringify(angleDifference)}, 向右转: ${turnRight}`);
        
        let tempAngle = startAngle;
        let tempPos = startPos;

        PathFinder.LOG(`[PathFinder.addAirplanePath] 开始逐步转弯`);

        // 逐步转弯到预期角度
        for (let i = 0; i < Object.keys(RailAngle).length; i++) {
            PathFinder.LOG(`[PathFinder.addAirplanePath] 第 ${i} 次转弯循环`);
            
            // if (tempAngle.equals(expectedAngle)) {
                PathFinder.LOG(`[PathFinder.addAirplanePath] 已达到预期角度，结束转弯`);
                break;
            // }

            const oldTempAngle = tempAngle;
            const oldTempPos = tempPos;
            
            PathFinder.LOG(`[PathFinder.addAirplanePath] 当前角度: ${oldTempAngle}, 当前位置: ${oldTempPos}`);
            
            // 计算旋转角度
            const rotateAngle = turnRight ? RailAngle.SEE : RailAngle.NEE;
            tempAngle = tempAngle.add(rotateAngle);
            
            PathFinder.LOG(`[PathFinder.addAirplanePath] 旋转角度: ${rotateAngle}, 新角度: ${tempAngle}`);
            
            // 计算位置偏移
            const posOffset = new Vec3(turnArc, 0, 0)
                .yRot(-oldTempAngle.angleRadians - rotateAngle.angleRadians / 2);
            
            PathFinder.LOG(`[PathFinder.addAirplanePath] 位置偏移: ${posOffset}`);
            
            tempPos = RailwayData.offsetBlockPos(
                oldTempPos, 
                posOffset.x, 
                posOffset.y, 
                posOffset.z
            );
            
            PathFinder.LOG(`[PathFinder.addAirplanePath] 新位置: ${tempPos}`);

            // 添加转弯路径数据
            if (reverse) {
                PathFinder.LOG(`[PathFinder.addAirplanePath] 反向添加转弯路径数据`);
                tempRailPath.unshift(new PathData(
                    new Rail(
                        tempPos, 
                        tempAngle.getOpposite(), 
                        oldTempPos, 
                        oldTempAngle, 
                        railType, 
                        TransportMode.AIRPLANE
                    ), 
                    0, 0, tempPos, oldTempPos, stopIndex
                ));
            } else {
                PathFinder.LOG(`[PathFinder.addAirplanePath] 正向添加转弯路径数据`);
                tempRailPath.push(new PathData(
                    new Rail(
                        oldTempPos, 
                        oldTempAngle, 
                        tempPos, 
                        tempAngle.getOpposite(), 
                        railType, 
                        TransportMode.AIRPLANE
                    ), 
                    0, 0, oldTempPos, tempPos, stopIndex
                ));
            }
            
            PathFinder.LOG(`[PathFinder.addAirplanePath] 转弯路径数据添加完成，临时路径长度: ${tempRailPath.length}`);
        }

        PathFinder.LOG(`[PathFinder.addAirplanePath] 飞机转弯路径添加完成，最终位置: ${JSON.stringify(tempPos)}`);
        // return tempPos;
        return new BlockPos(0, 0, 0);
    }
}

/**
 * 路径部分内部类
 */
class PathPart {
    public direction: RailAngle | null;
    public pos: BlockPos;
    public otherOptions: BlockPos[];

    constructor(direction: RailAngle | null, pos: BlockPos, otherOptions: BlockPos[]) {
        PathFinder.LOG(`[PathPart.constructor] 创建路径部分，方向: ${JSON.stringify(direction)}, 位置: ${JSON.stringify(pos)}, 选项数量: ${otherOptions.length}`);
        this.direction = direction;
        this.pos = pos;
        this.otherOptions = otherOptions;
    }

    /**
     * 检查是否与另一个位置和方向相同
     */
    public isSame(newPos: BlockPos, newDirection: RailAngle): boolean {
        const isSame = newPos.equals(this.pos) && newDirection == this.direction;
        PathFinder.LOG(`[PathPart.isSame] 检查相同性: ${JSON.stringify(newPos)} ${JSON.stringify(newDirection)} vs ${JSON.stringify(this.pos)} ${JSON.stringify(this.direction)} = ${isSame}`);
        return isSame;
    }
}
