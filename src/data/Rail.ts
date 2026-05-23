import { Entity, Player, system, Vector2, world } from "@minecraft/server";
import { canSpawnEntity, mandatorySpawnEntity, PosHelper } from "./Base";
import { RailAngle } from "./RailAngle";
import { RAIL_SEG_COUNT, RailType } from "./RailType";
import { TransportMode } from "./TransportMode";
import { ExtensionRail } from "ExtensionRegistry/ExtensionRegistry";
import { BlockPos } from "util/math/BlockPos";
import { SerializedDataBase } from "./SerializedDataBase";
import { Vec3 } from "util/math/Vec3";
import { MessagePackHelper } from "./MessagePackHelper";

export class Rail extends SerializedDataBase {
    
	public railType: RailType;
	public transportMode: TransportMode;
	public facingStart: RailAngle;
	public facingEnd: RailAngle;

    private h1: number;
    private k1: number;
    private r1: number;
    private tStart1: number;
    private tEnd1: number;

	private h2: number;
    private k2: number;
    private r2: number;
    private tStart2: number;
    private tEnd2: number;

    private yStart: number;
    private yEnd: number;

    private reverseT1 : boolean;
    private isStraight1 : boolean;
    private reverseT2 : boolean;
    private isStraight2 : boolean;


    private readonly entities: Set<Entity> = new Set();


    private static readonly ACCEPT_THRESHOLD = 1E-4;
    private static readonly MIN_RADIUS = 2;
    private static readonly CABLE_CURVATURE_SCALE = 1000;
    private static readonly MAX_CABLE_DIP = 8;

    // for curves:
	// x = h + r*cos(T)
	// z = k + r*sin(T)
	// for straight lines (both k and r >= 0.5):
	// x = h*T
	// z = k*T + h*r
	// for straight lines (otherwise):
	// x = h*T + k*r
	// z = k*T + h*r

    constructor(posStart: BlockPos, facingStart: RailAngle, posEnd: BlockPos, facingEnd: RailAngle, railType: RailType, transportMode: TransportMode);

    constructor(map: Record<string, unknown>);

    constructor(arg1: BlockPos | Record<string, unknown>, facingStart?: RailAngle, posEnd?: BlockPos, facingEnd?: RailAngle, railType?: RailType, transportMode?: TransportMode) {
        super();
        
        this.railType = RailType.NONE;
        this.transportMode = TransportMode.TRAIN;
        this.facingStart = RailAngle.E;
        this.facingEnd = RailAngle.E;
        this.h1 = 0;
        this.k1 = 0;
        this.r1 = 0;
        this.tStart1 = 0;
        this.tEnd1 = 0;
        this.h2 = 0;
        this.k2 = 0;
        this.r2 = 0;
        this.tStart2 = 0;
        this.tEnd2 = 0;
        this.yStart = 0;
        this.yEnd = 0;
        this.reverseT1 = false;
        this.isStraight1 = false;
        this.reverseT2 = false;
        this.isStraight2 = false;
        if (arg1 instanceof BlockPos) {
            this.reSet(arg1, facingStart!, posEnd!, facingEnd!, railType!, transportMode!);
        } else {
            this.deserializeData(arg1 as any);
        }
    }

    reSet(posStart: BlockPos, facingStart: RailAngle, posEnd: BlockPos, facingEnd: RailAngle, railType: RailType, transportMode: TransportMode) {
        this.facingStart = facingStart;
        this.facingEnd = facingEnd;
        this.railType = railType;
        this.transportMode = transportMode;
        this.yStart = posStart.getY();
        this.yEnd = posEnd.getY();

        const xStart = posStart.getX();
        const zStart = posStart.getZ();
        const xEnd = posEnd.getX();
        const zEnd = posEnd.getZ();

		// Coordinate system translation and rotation
		// 坐标系平移和旋转
        const vecDifference = new Vec3(posEnd.getX() - posStart.getX(), 0, posEnd.getZ() - posStart.getZ());
        const vecDifferenceRotated = vecDifference.yRot(facingStart.angleRadians);

        // First we check the Delta Side > 0
		// 1. If they are same angle
		// 1. a. If aligned -> Use One Segment
		// 1. b. If not aligned -> Use two Circle, r = (dv^2 + dp^2) / (4dv).
		// 2. If they are right angle -> r = min ( dx,dz ), work around, actually equation 3. can be used.
		// 3. Check if one segment and one circle is available
		// 3. a. If available -> (Segment First) r2 = dv / ( sin(diff) * tan(diff/2) ) = dv / ( 1 - cos(diff)
		// 							for case 2, diff = 90 degrees, r = dv
		//					-> (Circle First) r1 = ( dp - dv / tan(diff) ) / tan (diff/2)
		// TODO 3. b. If not -> r = very complex one. In this case, we need two circles to connect.
		//
		// 首先检查 Delta 侧 > 0 的情况
		// 1. 如果两者角度相同
		// 1. a. 如果共线 -> 使用单一线段连接
		// 1. b. 如果不共线 -> 使用两个圆形连接，半径 r = (dv² + dp²) / (4dv)

		// 2. 如果两者成直角 -> 半径 r = min(dx, dz)，实际可通过绕行实现，方程3也可适用

		// 3. 检查是否可采用"一线一圆"组合方案
		// 3. a. 如果可行 -> (先线段后圆弧) r2 = dv / ( sin(差值角) * tan(差值角/2) ) = dv / (1 - cos(差值角))
		//              当情况2中差值角=90度时，r = dv
		//           -> (先圆弧后线段) r1 = ( dp - dv / tan(差值角) ) / tan(差值角/2)
		// 待办 3. b. 如果不可行 -> 半径计算将非常复杂。此种情况下需要使用两个圆形进行连接
        const deltaForward = vecDifferenceRotated.z;
        const deltaSide = vecDifferenceRotated.x;
        if (facingStart.isParallel(facingEnd)) { // 1
            if (Math.abs(deltaForward) < Rail.ACCEPT_THRESHOLD) { // 1. a.
                this.h1 = facingStart.cos;
                this.k1 = facingStart.sin;
                if (Math.abs(this.h1) >= 0.5 && Math.abs(this.k1) >= 0.5) {
                    this.r1 = (this.h1 * zStart - this.k1 * xStart) / this.h1 / this.h1;
                    this.tStart1 = xStart / this.h1;
                    this.tEnd1 = xEnd / this.h1;
                } else {
                    const div = facingStart.add(facingStart).cos;
                    this.r1 = (this.h1 * zStart - this.k1 * xStart) / div;
                    this.tStart1 = (this.h1 * xStart - this.k1 * zStart) / div;
                    this.tEnd1 = (this.h1 * xEnd - this.k1 * zEnd) / div;
                }
                this.h2 = this.k2 = this.r2 = 0;
                this.reverseT1 = this.tStart1 > this.tEnd1;
                this.reverseT2 = false;
                this.isStraight1 = this.isStraight2 = true;
                this.tStart2 = this.tEnd2 = 0;
            } else { // 1. b
                if (Math.abs(deltaSide) > Rail.ACCEPT_THRESHOLD) {
                    const radius = (deltaForward * deltaForward + deltaSide * deltaSide) / (4 * deltaForward);
                    this.r1 = this.r2 = Math.abs(radius);
                    this.h1 = xStart - radius * facingStart.sin;
                    this.k1 = zStart + radius * facingStart.cos;
                    this.h2 = xEnd - radius * facingEnd.sin;
                    this.k2 = zEnd + radius * facingEnd.cos;
                    this.reverseT1 = (deltaForward < 0) !== (deltaSide < 0);
                    this.reverseT2 = !this.reverseT1;
                    this.tStart1 = Rail.getTBounds(xStart, this.h1, zStart, this.k1, this.r1);
                    this.tEnd1 = Rail.getTBoundsWithReverse(xStart + vecDifference.x / 2, this.h1, zStart + vecDifference.z / 2, this.k1, this.r1, this.tStart1, this.reverseT1);
                    this.tStart2 = Rail.getTBounds(xStart + vecDifference.x / 2, this.h2, zStart + vecDifference.z / 2, this.k2, this.r2);
                    this.tEnd2 = Rail.getTBoundsWithReverse(xEnd, this.h2, zEnd, this.k2, this.r2, this.tStart2, this.reverseT2);
                    this.isStraight1 = this.isStraight2 = false;
                } else {
					// Banned node perpendicular to the rail nodes direction
                    this.h1 = this.k1 = this.h2 = this.k2 = this.r1 = this.r2 = 0;
                    this.tStart1 = this.tStart2 = this.tEnd1 = this.tEnd2 = 0;
                    this.reverseT1 = false;
                    this.reverseT2 = false;
                    this.isStraight1 = this.isStraight2 = true;
                }
            }
        } else { // 3.
			// Check if it needs invert
            const newFacingStart = vecDifferenceRotated.x < -Rail.ACCEPT_THRESHOLD ? facingStart.getOpposite() : facingStart;
            const newFacingEnd = facingEnd.cos * vecDifference.x + facingEnd.sin * vecDifference.z < -Rail.ACCEPT_THRESHOLD ? facingEnd.getOpposite() : facingEnd;
            const angleForward = Math.atan2(deltaForward, deltaSide);
            const railAngleDifference = newFacingEnd.sub(newFacingStart);
            let angleDifference = railAngleDifference.angleRadians;
            
            // ToBedrockEditFix:
            // The angle difference returned by the RailAngle.sub() method is always a positive value (0-360°), 
            //      rather than the angle difference considering the shortest path (-180° to 180°).
            //
            // So we normalize the angle difference to the range of -π to π.
            //
            // 到基岩版的修复:
            // RailAngle.sub() 方法返回的角度差总是正值（0-360°），
            //      而不是考虑最短路径的角度差（-180°到180°）。
            //
            // 所以我们标准化角度差到 -π 到 π 范围。
            if (angleDifference > Math.PI) {
                angleDifference -= 2 * Math.PI;
            } else if (angleDifference < -Math.PI) {
                angleDifference += 2 * Math.PI;
            }

            if (Math.sign(angleForward) === Math.sign(angleDifference)) {
                const absAngleForward = Math.abs(angleForward);

                if (absAngleForward - Math.abs(angleDifference / 2) < Rail.ACCEPT_THRESHOLD) { // Segment First | 线段优先
                    const offsetSide = Math.abs(deltaForward / railAngleDifference.halfTan);
                    const remainingSide = deltaSide - offsetSide;
                    const deltaXEnd = xStart + remainingSide * newFacingStart.cos;
                    const deltaZEnd = zStart + remainingSide * newFacingStart.sin;
                    this.h1 = newFacingStart.cos;
                    this.k1 = newFacingStart.sin;
                    if (Math.abs(this.h1) >= 0.5 && Math.abs(this.k1) >= 0.5) {
                        this.r1 = (this.h1 * zStart - this.k1 * xStart) / this.h1 / this.h1;
                        this.tStart1 = xStart / this.h1;
                        this.tEnd1 = deltaXEnd / this.h1;
                    } else {
                        const div = newFacingStart.add(newFacingStart).cos;
                        this.r1 = (this.h1 * zStart - this.k1 * xStart) / div;
                        this.tStart1 = (this.h1 * xStart - this.k1 * zStart) / div;
                        this.tEnd1 = (this.h1 * deltaXEnd - this.k1 * deltaZEnd) / div;
                    }
                    this.isStraight1 = true;
                    this.reverseT1 = this.tStart1 > this.tEnd1;
                    const radius = deltaForward / (1 - railAngleDifference.cos);
                    this.r2 = Math.abs(radius);
                    this.h2 = deltaXEnd - radius * newFacingStart.sin;
                    this.k2 = deltaZEnd + radius * newFacingStart.cos;
                    this.reverseT2 = (deltaForward < 0);
                    this.tStart2 = Rail.getTBounds(deltaXEnd, this.h2, deltaZEnd, this.k2, this.r2);
                    this.tEnd2 = Rail.getTBoundsWithReverse(xEnd, this.h2, zEnd, this.k2, this.r2, this.tStart2, this.reverseT2);
                    this.isStraight2 = false;
                } else if (absAngleForward - Math.abs(angleDifference) < Rail.ACCEPT_THRESHOLD) { // Circle First | 圆形优先
                    const crossSide = deltaForward / railAngleDifference.tan;
                    const remainingSide = (deltaSide - crossSide) * (1 + railAngleDifference.cos);
                    const remainingForward = (deltaSide - crossSide) * (railAngleDifference.sin);
                    const deltaXEnd = xStart + remainingSide * newFacingStart.cos - remainingForward * newFacingStart.sin;
                    const deltaZEnd = zStart + remainingSide * newFacingStart.sin + remainingForward * newFacingStart.cos;
                    const radius = (deltaSide - deltaForward / railAngleDifference.tan) / railAngleDifference.halfTan;
                    this.r1 = Math.abs(radius);
                    this.h1 = xStart - radius * newFacingStart.sin;
                    this.k1 = zStart + radius * newFacingStart.cos;
                    this.isStraight1 = false;
                    this.reverseT1 = (deltaForward < 0);
                    this.tStart1 = Rail.getTBounds(xStart, this.h1, zStart, this.k1, this.r1);
                    this.tEnd1 = Rail.getTBoundsWithReverse(deltaXEnd, this.h1, deltaZEnd, this.k1, this.r1, this.tStart1, this.reverseT1);
                    this.h2 = newFacingEnd.cos;
                    this.k2 = newFacingEnd.sin;
                    if (Math.abs(this.h2) >= 0.5 && Math.abs(this.k2) >= 0.5) {
                        this.r2 = (this.h2 * deltaZEnd - this.k2 * deltaXEnd) / this.h2 / this.h2;
                        this.tStart2 = deltaXEnd / this.h2;
                        this.tEnd2 = xEnd / this.h2;
                    } else {
                        const div = newFacingEnd.add(newFacingEnd).cos;
                        this.r2 = (this.h2 * deltaZEnd - this.k2 * deltaXEnd) / div;
                        this.tStart2 = (this.h2 * deltaXEnd - this.k2 * deltaZEnd) / div;
                        this.tEnd2 = (this.h2 * xEnd - this.k2 * zEnd) / div;
                    }
                    this.isStraight2 = true;
                    this.reverseT2 = this.tStart2 > this.tEnd2;
                } else { // Out of available range | 超出可用范围
					// TODO complex one. Normally we don't need it. | 待办：复杂情况。通常我们不需要它。
                    this.h1 = this.k1 = this.h2 = this.k2 = this.r1 = this.r2 = 0;
                    this.tStart1 = this.tStart2 = this.tEnd1 = this.tEnd2 = 0;
                    this.reverseT1 = false;
                    this.reverseT2 = false;
                    this.isStraight1 = this.isStraight2 = true;
                }
            } else {
				// TODO 3. b. If not -> r = very complex one. Normally we don't need it.
                //
				// 待办 3. b. 如果不是 -> r = 非常复杂的情况。通常我们不需要它。
                this.h1 = this.k1 = this.h2 = this.k2 = this.r1 = this.r2 = 0;
                this.tStart1 = this.tStart2 = this.tEnd1 = this.tEnd2 = 0;
                this.reverseT1 = false;
                this.reverseT2 = false;
                this.isStraight1 = this.isStraight2 = true;
            }
        }
    }

    private deserializeData(map: Record<string, unknown>) {
        const messagePackHelper = new MessagePackHelper(map as ReturnType<this['toMessagePack']>);
        this.h1 = messagePackHelper.getDouble("h_1");
        this.k1 = messagePackHelper.getDouble("k_1");
        this.h2 = messagePackHelper.getDouble("h_2");
        this.k2 = messagePackHelper.getDouble("k_2");
        this.r1 = messagePackHelper.getDouble("r_1");
        this.r2 = messagePackHelper.getDouble("r_2");
        this.tStart1 = messagePackHelper.getDouble("t_start_1");
        this.tEnd1 = messagePackHelper.getDouble("t_end_1");
        this.tStart2 = messagePackHelper.getDouble("t_start_2");
        this.tEnd2 = messagePackHelper.getDouble("t_end_2");
        this.yStart = messagePackHelper.getInt("y_start");
        this.yEnd = messagePackHelper.getInt("y_end");
        this.reverseT1 = messagePackHelper.getBoolean("reverse_t_1");
        this.isStraight1 = messagePackHelper.getBoolean("is_straight_1");
        this.reverseT2 = messagePackHelper.getBoolean("reverse_t_2");
        this.isStraight2 = messagePackHelper.getBoolean("is_straight_2");
        this.railType = RailType.valueOf(messagePackHelper.getString("rail_type"));
        this.transportMode = TransportMode.fromString(messagePackHelper.getString("transport_mode"));
        
        messagePackHelper.iterateArrayValue("entities", id => {
            const entity = world.getEntity(id.asString());
            if (entity) {
                this.entities.add(entity);
            }
        });

        this.facingStart = this.getRailAngle(false);
        this.facingEnd = this.getRailAngle(true);
    }

    public override toMessagePack() {
        return {
            h_1: this.h1,
            k_1: this.k1,
            h_2: this.h2,
            k_2: this.k2,
            r_1: this.r1,
            r_2: this.r2,
            t_start_1: this.tStart1,
            t_end_1: this.tEnd1,
            t_start_2: this.tStart2,
            t_end_2: this.tEnd2,
            y_start: this.yStart,
            y_end: this.yEnd,
            reverse_t_1: this.reverseT1,
            is_straight_1: this.isStraight1,
            reverse_t_2: this.reverseT2,
            is_straight_2: this.isStraight2,
            rail_type: this.railType.toString(),
            transport_mode: this.transportMode.toString(),

            entities: Array.from(this.entities, item => item.id)
        } as const;
    }

    async createEntitiesExt(theStyle: ExtensionRail, player: Player) {
        const length = this.getLength();

        const MobleWidth = theStyle.single_segment_model_length;

        const Tolerance = 0;
        const MobleSetWidth = MobleWidth * RAIL_SEG_COUNT;
        const MobleSetCount = Math.ceil(length / (MobleSetWidth - Tolerance));
        const MobleSetSpacing = MobleSetCount > 1 ? (length - MobleSetWidth) / (MobleSetCount - 1) : 0;
        const MobleSetStartOffset = MobleWidth / 2;
        // const MobleSetStartOffset = -length / 2 + MobleSetWidth / 2;
        const MobleSpacingInSet = (MobleSetWidth - MobleWidth) / (MobleSetCount - 1);

        for (let i = 0; i < MobleSetCount; i++) {
            const MobleSetCenterDistance = MobleSetStartOffset + i * MobleSetSpacing;
            const EntityPos = PosHelper.offset(this.getPosition(MobleSetCenterDistance), 0, 0.1, 0);
            // const EntityRot = this.getAngleAtPosition(MobleSetCenterDistance);
            const EntityRot = 0;

            const RailEntity = await mandatorySpawnEntity("overworld", player.location, theStyle.entity_name, EntityPos);

            this.entities.add(RailEntity);
            // RailSegEntity.setRotation({x: 0, y: EntityRot});
            RailEntity.playAnimation("animation.rail.curve");


            for (let j = 0; j < RAIL_SEG_COUNT; j++) {
                const MobleOffsetInAtlas = j * MobleSpacingInSet;
                const MobleOffsetFromCenter = MobleOffsetInAtlas - MobleSetWidth / 2 + MobleWidth / 2;
                
                // const CurrentMobleDistance = MobleSetCenterDistance + MobleOffsetFromCenter;
                const CurrentMobleDistance = MobleSetCenterDistance + j * MobleWidth;

                let pos;
                let rot;
                // if (j = 0) {
                    pos = this.getPosition(CurrentMobleDistance);
                    rot = this.getAngleAtPosition(CurrentMobleDistance);
                // } else {
                //     const lastRot = this.getAngleAtPosition(MobleSetCenterDistance + ((j - 1) * MobleWidth));
                //     const currentRot = this.getAngleAtPosition(CurrentMobleDistance);
                //     const diff = Math.abs(currentRot - lastRot) / 15;
                //     pos = this.getPosition(Math.max(0, CurrentMobleDistance - diff));
                //     angle = this.getAngleAtPosition(Math.max(0, CurrentMobleDistance - diff));
                // }

                const pos_offset = Vec3.fromVector3(pos).subtract(Vec3.fromVector3(EntityPos));
                const rot_offset = rot;
                RailEntity.setProperty(`mts:seg${j + 1}_x`, pos_offset.x * 16);
                RailEntity.setProperty(`mts:seg${j + 1}_y`, pos_offset.y * 16);
                RailEntity.setProperty(`mts:seg${j + 1}_z`, - pos_offset.z * 16);

                RailEntity.setProperty(`mts:seg${j + 1}_y_rot`, rot_offset.y);
                RailEntity.setProperty(`mts:seg${j + 1}_x_rot`, rot_offset.x);
            }
        }
    }

    createEntities(player: Player) {
        this.createEntitiesExt({
            name: "",
            entity_name: "mts:rail",
            single_segment_model_length: 0.5,
        }, player)
    }

    // createEntities() {
    //     const length = this.getLength();

    //     const effectiveLength = length - this.railType.entityOringinLength;  // 因为两端各占0.5
    //     const n = Math.max(1, Math.ceil(effectiveLength / this.railType.entityOringinLength));
    //     const actualInterval = effectiveLength / n;


    //     const L0: number = actualInterval;      // 原始模型放置间隔（沿曲线弧长）
    //     const M: number = L0;       // 模型实际长度（沿切线方向）
    //     const maxComp: number = 1 / 16; // 最大补偿限制
    //     // 计算并放置模型
    //     let s: number = M / 2; // 当前弧长位置
    //     let s_next: number = 0;
    //     let angleCurrent: Vector2 = {x: 0, y: 0};
    //     let angleNext: Vector2 = {x: 0, y: 0};
    //     let delta_theta: Vector2 = {x: 0, y: 0};
    //     let delta_s: Vector2 = {x: 0, y: 0};
    //     let delta_s_clamped: number = 0;

    //     const MAX = 5;

    //     let i = 1;

    //     let RailEntity;
    //     let EntityPos;

    //     let j = 0;
    //     let POS = [];

    //     while (s < length/* - M / 2*/) {
    //         angleCurrent = this.getAngleAtPosition(s);
    //         angleNext = this.getAngleAtPosition(s + L0);
    //         delta_theta = {x: angleNext.x - angleCurrent.x, y: angleNext.y - angleCurrent.y};
            
    //         // 补偿公式
    //         delta_s = {x: -M/2 * delta_theta.x, y: -M/2 * delta_theta.y};
            
    //         // 限制在[-0.5, 0.5]范围内
    //         if (delta_s.y > maxComp) {
    //             delta_s_clamped = -maxComp;
    //         } else if (delta_s.y < -maxComp) {
    //             delta_s_clamped = maxComp - 1 / 16;
    //         } else {
    //             delta_s_clamped = 0;
    //         }

    //         if (j == MAX) {
    //             function a(nums: number[])
    //             {
    //                 const max = Math.max(...nums);
    //                 const min = Math.min(...nums);

    //                 return max - min < 1;
    //             }

    //             if (a(POS))
    //             {
    //                 console.error("暂停");
    //                 console.error(L0);
    //             }
    //         }
            
    //         // 计算下一个放置点的弧长
    //         // s_next = s + L0 + delta_s_clamped;
    //         s_next = s + L0 + 0;
            
    //         if (i == 1)
    //         {
    //             EntityPos = this.getPosition(s);
    //             POS.push(s);
    //             RailEntity = world.getDimension('overworld').spawnEntity(this.railType.entityId, {
    //                 x: EntityPos.x,
    //                 y: EntityPos.y,
    //                 z: EntityPos.z
    //             });
    //             RailEntity.playAnimation("animation.rail.curve");
    //             this.entities.push(RailEntity);
    //             j += 1;
    //         }
            
    //         const pos = this.getPosition(s);
    //         const angle = this.getAngleAtPosition(s);

    //         const pos_offset = Vec3.fromVector3(pos).subtract(Vec3.fromVector3(EntityPos!));

    //         RailEntity!.setProperty(`mts:seg${i}_x`, pos_offset.x * 16);
    //         RailEntity!.setProperty(`mts:seg${i}_y`, pos_offset.y * 16);
    //         RailEntity!.setProperty(`mts:seg${i}_z`, - pos_offset.z * 16);

    //         RailEntity!.setProperty(`mts:seg${i}_y_rot`, angle.y);
    //         RailEntity!.setProperty(`mts:seg${i}_x_rot`, angle.x);
            
    //         s = s_next; // 移动到下一个点

    //         i += 1;

    //         if (i == RAIL_SEG_COUNT + 1)
    //         {
    //             i = 1;
    //         }
    //     }

    //     while (i <= RAIL_SEG_COUNT) {
    //         RailEntity!.setProperty(`mts:seg${i}_x`, 360);  //HIDE
    //         RailEntity!.setProperty(`mts:seg${i}_y`, 360);
    //         RailEntity!.setProperty(`mts:seg${i}_z`, 360);

    //         i += 1;
    //     }
    // }

    destroyEntities() {
        system.run(() => {
            for (const element of this.entities) {
                try {
                    element.remove();
                } catch (e) { }
            }
            this.entities.clear();
        });
    }

    getPosition(rawValue: number): Vec3 {
        const count1 = Math.abs(this.tEnd1 - this.tStart1);
        const count2 = Math.abs(this.tEnd2 - this.tStart2);
        const value = Math.max(0, Math.min(rawValue, count1 + count2));
        const y = this.getPositionY(value);

        if (value <= count1) {
            const pos = Rail.getPositionXZ(this.h1, this.k1, this.r1, (this.reverseT1 ? -1 : 1) * value + this.tStart1, 0, this.isStraight1);
            return new Vec3(pos.x, y, pos.z);
        } else {
            const pos = Rail.getPositionXZ(this.h2, this.k2, this.r2, (this.reverseT2 ? -1 : 1) * (value - count1) + this.tStart2, 0, this.isStraight2);
            return new Vec3(pos.x, y, pos.z);
        }
    }

    getLength() {
        return Math.abs(this.tEnd2 - this.tStart2) + Math.abs(this.tEnd1 - this.tStart1);
    }

    goodRadius() {
        return (this.isStraight1 || this.r1 > Rail.MIN_RADIUS - Rail.ACCEPT_THRESHOLD) && 
               (this.isStraight2 || this.r2 > Rail.MIN_RADIUS - Rail.ACCEPT_THRESHOLD);
    }

    isValid() {
        return (this.h1 !== 0 || this.k1 !== 0 || this.h2 !== 0 || this.k2 !== 0 || 
                this.r1 !== 0 || this.r2 !== 0 || this.tStart1 !== 0 || this.tStart2 !== 0 || 
                this.tEnd1 !== 0 || this.tEnd2 !== 0) && 
                this.facingStart === this.getRailAngle(false) && 
                this.facingEnd === this.getRailAngle(true);
        // return true;
    }

    getPositionY(value: number) {
        const length = this.getLength();

        if (this.railType.railSlopeStyle === "CABLE") {
            if (value < 0.5) {
                return this.yStart;
            } else if (value > length - 0.5) {
                return this.yEnd;
            }

            const offsetValue = value - 0.5;
            const offsetLength = length - 1;
            const posY = this.yStart + (this.yEnd - this.yStart) * offsetValue / offsetLength;
            const dip = offsetLength * offsetLength / 4 / Rail.CABLE_CURVATURE_SCALE;
            return posY + (dip > Rail.MAX_CABLE_DIP ? Rail.MAX_CABLE_DIP / dip : 1) * (offsetValue - offsetLength) * offsetValue / Rail.CABLE_CURVATURE_SCALE;
        } else {
            const intercept = length / 2;
            let yChange, yInitial, offsetValue;

            if (value < intercept) {
                yChange = (this.yEnd - this.yStart) / 2;
                yInitial = this.yStart;
                offsetValue = value;
            } else {
                yChange = (this.yStart - this.yEnd) / 2;
                yInitial = this.yEnd;
                offsetValue = length - value;
            }

            return yChange * offsetValue * offsetValue / (intercept * intercept) + yInitial;
        }
    }

    static getPositionXZ(h: number, k: number, r: number, t: number, radiusOffset: number, isStraight : boolean) {
        if (isStraight) {
            return {
                x: h * t + k * ((Math.abs(h) >= 0.5 && Math.abs(k) >= 0.5 ? 0 : r) + radiusOffset) + 0.5,
                z: k * t + h * (r - radiusOffset) + 0.5
            };
        } else {
            return {
                x: h + (r + radiusOffset) * Math.cos(t / r) + 0.5,
                z: k + (r + radiusOffset) * Math.sin(t / r) + 0.5
            };
        }
    }

    getRailAngle(getEnd : boolean) {
        const start = getEnd ? this.getLength() : 0;
        const end = getEnd ? start - Rail.ACCEPT_THRESHOLD : Rail.ACCEPT_THRESHOLD;
        const pos1 = this.getPosition(start);
        const pos2 = this.getPosition(end);
        return RailAngle.fromAngle(Math.atan2(pos2.z - pos1.z, pos2.x - pos1.x) * 180 / Math.PI);
    }

    static getTBounds(x: number, h: number, z: number, k: number, r: number): number {
        return Math.atan2(z - k, x - h) * r;
    }

    isEqual(other : Rail) {

        function B(a: number) {
            return Math.round(a * 100) / 100;
        }

        var a1 = B(other.yStart) == B(this.yStart) && B(other.yEnd) == B(this.yEnd) && B(other.h1) == B(this.h1) && B(other.h2) == B(this.h2) && 
                B(other.k1) == B(this.k1) && B(other.k2) == B(this.k2) && B(other.r1) == B(this.r1) && B(other.r2) == B(this.r2);

        var a2 = B(other.yStart) == B(this.yEnd) && B(other.yEnd) == B(this.yStart) && B(other.h1) == B(this.h2) && B(other.h2) == B(this.h1) && 
                B(other.k1) == B(this.k2) && B(other.k2) == B(this.k1) && B(other.r1) == B(this.r2) && B(other.r2) == B(this.r1);

        var c = a1 || a2;

        console.warn(c);
        console.warn("a1 ", a1);
        console.warn("a2 ", a2);

        if (c == false) {
            console.warn("0");
            if (!other.reverseT1 && !this.reverseT1 &&
                !other.reverseT2 && !this.reverseT2  &&
                other.isStraight1 && this.isStraight1 &&
                other.isStraight2 && this.isStraight2
            ) {
                console.warn("1");
                if ((B(other.yStart) == B(this.yStart) && B(other.yEnd) == B(this.yEnd)) || (B(other.yStart) == B(this.yEnd) && B(other.yEnd) == B(this.yStart))) {
                    console.warn("2");
                    if (B(other.k2) == B(this.k2) && B(other.h2) == B(this.h2)) {
                        console.warn("3");
                        if (Math.abs(B(other.k1)) == Math.abs(B(this.k1))) {
                            console.warn("4");
                            if (Math.abs(B(other.r1)) == Math.abs(B(this.r1))) {
                                console.warn("5");
                                c = true;
                            }
                        }
                    }
                } 
            }
        }

        function LOG(obj : any, name : string) {
            const jsonString = JSON.stringify(obj, (key, value) => {
                if (typeof value === 'number') {
                    return B(value);
                }
                return value;
            }, 2);
            console.warn(name);
            console.warn(jsonString);
        }

        if (!c) {
            LOG(this, "this: ");
            LOG(other, "other: ");
        }

        return c;
    }

    static getTBoundsWithReverse(x: number, h: number, z: number, k: number, r: number, tStart: number, reverse : boolean) {
        const t = Rail.getTBounds(x, h, z, k, r);
        if (t < tStart && !reverse) {
            return t + 2 * Math.PI * r;
        } else if (t > tStart && reverse) {
            return t - 2 * Math.PI * r;
        } else {
            return t;
        }
    }



    


    public getAngleAtPosition(positionValue: number): Vector2 {
        const length = this.getLength();
        
        // 使用微小偏移量计算方向向量
        // const delta = Math.min(0.1, length * 0.01); // 动态delta，避免过大
        const delta = Math.min(0.01);
        
        let pos1, pos2;
        
        if (positionValue <= delta) {
            // 靠近起点，使用起点方向
            pos1 = this.getPosition(0);
            pos2 = this.getPosition(delta);
        } else if (positionValue >= length - delta) {
            // 靠近终点，使用终点方向
            pos1 = this.getPosition(length - delta);
            pos2 = this.getPosition(length);
        } else {
            // 中间位置，计算前后方向
            pos1 = this.getPosition(positionValue - delta);
            pos2 = this.getPosition(positionValue + delta);
        }
        
        const dx = pos2.x - pos1.x;
        const dz = pos2.z - pos1.z;
        
        // 计算角度（弧度转角度）
        const yaw = Math.atan2(dz, dx) * 180 / Math.PI;

        
        const deltaY = pos2.y - pos1.y;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const pitch = Math.atan2(deltaY, horizontalDist) * 180 / Math.PI;

        return {
            x: pitch,
            y: yaw + 90
        };
    }

    public getEntities(): ReadonlySet<Entity> {
        return this.entities;
    }
}
