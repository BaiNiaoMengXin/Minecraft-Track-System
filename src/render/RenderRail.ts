import { MolangVariableMap, Player, system, Vector3, world } from "@minecraft/server";
import { rgbHexToColor } from "data/Base";
import { Rail } from "data/Rail";
import { RailType } from "data/RailType";
import { MTS } from "MTS";
import { MTSClient } from "MTSClient";
import { PathData } from "path/PathData";
import { ParticleSystem, particleType } from "rail/ParticleSystem";
import { DyeColor } from "util/DyeColor";
import { BlockPos } from "util/math/BlockPos";
import { Mth } from "util/math/Mth";
import { Vec3 } from "util/math/Vec3";

export namespace RenderRail {

    export const SMALL_OFFSET: number = 0.003125;
    
    const MIN_RENDER_PRECISION = 1.25;

    function getRailInLengthLeftRightPoints(rail: Rail, length: number, railWidth: number): [Vec3, Vec3] {
        const point = rail.getPosition(length);
        const angle = rail.getAngleAtPosition(length).y + 90;
        const angleRad = Mth.toRadians(angle);
        const railWidth2 = railWidth / 2;

        const leftAngleRad = angleRad - Math.PI / 2;
        const leftX = point.x + railWidth2 * Math.cos(leftAngleRad);
        const leftZ = point.z + railWidth2 * Math.sin(leftAngleRad);
        
        const rightAngleRad = angleRad + Math.PI / 2;
        const rightX = point.x + railWidth2 * Math.cos(rightAngleRad);
        const rightZ = point.z + railWidth2 * Math.sin(rightAngleRad);
        
        return [
            new Vec3(leftX, point.y, leftZ),
            new Vec3(rightX, point.y, rightZ)
        ];
    }

    function getLODResolution(player: Player | null, pos: Vector3 | null): number {
        if (player == null || pos == null) {
            return 0.75;
        }

        const playerPos = player.location;
        const dx = playerPos.x - pos.x;
        const dy = playerPos.y - pos.y;
        const dz = playerPos.z - pos.z;
        const distance =  Math.sqrt(dx * dx + dy * dy + dz * dz);
        // Linear mapping: (0 -> 1.25), (48 -> 8)
        // Slope
        const k = (8 - MIN_RENDER_PRECISION) / 48;
        return MIN_RENDER_PRECISION + k * distance;
    }

    export function particleRenderRailStandard(rail: Rail, yOffset: number, opacity: number, railWidth: number, player: Player | null, useLOD: boolean, duration: number): void {
        const maxRenderDistance = 4 * 16;
        const railLength = rail.getLength();
        const dimension = world.getDimension("overworld");

        if (rail.railType == RailType.NONE) {
            let lastPoint = rail.getPosition(0);
            
            let flag = false;
            for (let i = 1.5; ; i += 1.5) {
                if (i > railLength) {
                    if (!flag) {
                        flag = true;
                    } else {
                        break;
                    }
                }

                const newPoint = rail.getPosition(i);
                const middlePos = lastPoint.lerp(newPoint, 0.5).add(0, yOffset, 0);

                const dx = newPoint.x - lastPoint.x;
                const dy = newPoint.y - lastPoint.y;
                const dz = newPoint.z - lastPoint.z;
                const yaw = Math.atan2(dz, dx);
                const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

                if (player == null || middlePos.distanceTo(player.location) < maxRenderDistance) {
                    const molang = new MolangVariableMap();
                    
                    molang.setVector3("variable.rot", {
                        x: Math.cos(pitch) * Math.cos(yaw),
                        y: Math.sin(pitch),
                        z: Math.cos(pitch) * Math.sin(yaw)
                    });
                    molang.setFloat("variable.mts_particle_lifetime", duration / 2)
                    try {
                        (player ? player.dimension : world.getDimension("overworld")).spawnParticle("mts:one_way_rail_arrow", middlePos, molang);
                    } catch (error) {
                    }
                }
    
                lastPoint = newPoint;
            }
        } else {
            let lastPoints = getRailInLengthLeftRightPoints(rail, 0, railWidth + (2 / 16));// particle texture width is 2px
            
            let flag = false;
            for (let i = useLOD ? getLODResolution(player, lastPoints[0]) : MIN_RENDER_PRECISION; ; i += useLOD ? getLODResolution(player, lastPoints[0]) : MIN_RENDER_PRECISION) {
                if (i > railLength) {
                    if (!flag) {
                        flag = true;
                    } else {
                        break;
                    }
                }

                const newPoints = getRailInLengthLeftRightPoints(rail, i, railWidth + (2 / 16));
                const middlePosLeft = lastPoints[0].lerp(newPoints[0], 0.5);
                const middlePosRight = lastPoints[1].lerp(newPoints[1], 0.5);
                
                const railColor = rgbHexToColor(rail.railType.color);
                railColor.alpha = opacity;
                const l = lastPoints[0].distanceTo(newPoints[0]) / 2;
                const l2 = lastPoints[1].distanceTo(newPoints[1]) / 2;

                const dx: [number, number] = [newPoints[0].getX() - lastPoints[0].getX(), newPoints[1].getX() - lastPoints[1].getX()];
                const dy: [number, number] = [newPoints[0].getY() - lastPoints[0].getY(), newPoints[1].getY() - lastPoints[1].getY()];
                const dz: [number, number] = [newPoints[0].getZ() - lastPoints[0].getZ(), newPoints[1].getZ() - lastPoints[1].getZ()];
                const yaw: [number, number] = [Math.atan2(dz[0], dx[0]), Math.atan2(dz[1], dx[1])];
                const pitch: [number, number] = [
                    Math.atan2(dy[0], Math.sqrt(dx[0] * dx[0] + dz[0] * dz[0])),
                    Math.atan2(dy[1], Math.sqrt(dx[1] * dx[1] + dz[1] * dz[1]))
                ]

                if (player == null || (middlePosLeft.distanceTo(player.location) < maxRenderDistance))
                {
                    ParticleSystem.layParticle(
                        particleType.rail_preview_left,
                        middlePosLeft.add(0, yOffset, 0),
                        {
                            x: Math.cos(pitch[0]) * Math.cos(yaw[0]),
                            y: Math.sin(pitch[0]),
                            z: Math.cos(pitch[0]) * Math.sin(yaw[0])
                        },
                        {x: 0.1, y: l},
                        railColor,
                        duration / 2
                    )
    
                    ParticleSystem.layParticle(
                        particleType.rail_preview_right,
                        middlePosRight.add(0, yOffset, 0),
                        {
                            x: Math.cos(pitch[1]) * Math.cos(yaw[1]),
                            y: Math.sin(pitch[1]),
                            z: Math.cos(pitch[1]) * Math.sin(yaw[1])
                        },
                        {x: 0.1, y: l2},
                        railColor,
                        duration / 2
                    )
                }
    
                lastPoints = newPoints;
            }
        }
    }


    export function particleRenderSignalsStandard(rail: Rail, startPos: BlockPos, endPos: BlockPos, player: Player, duration: number): void {
        const maxRenderDistance = 4 * 16;
        const railLength = rail.getLength();

        const signalBlocks = MTS.railwayData.signalBlocks.getSignalBlocksAtTrack(PathData.getRailProduct(startPos, endPos));

        const referenceWidth = 1 / 16;

		for (let i = 0; i < signalBlocks.length; i++) {
			const signalBlock = signalBlocks[i];
			const shouldGlow = signalBlock.isOccupied() && system.currentTick % 20 < 10;
			// const particleId = shouldGlow ? particleType.show2 : "mts:white_wool";
			const particleId = particleType.show2;
			const width = referenceWidth * i + 1 - referenceWidth * signalBlocks.length / 2;

			const color = rgbHexToColor(0xFF000000 | signalBlock.dyeColor.materialColor);

            color.red = Math.min(color.red + (shouldGlow ? 0.3 : 0), 1);
            color.green = Math.min(color.green + (shouldGlow ? 0.3 : 0), 1);
            color.blue = Math.min(color.blue + (shouldGlow ? 0.3 : 0), 1);

            let lastPoint = rail.getPosition(0);
            
            let flag = false;
            for (let i = getLODResolution(player, lastPoint); ; i += getLODResolution(player, lastPoint)) {
                if (i > railLength) {
                    if (!flag) {
                        flag = true;
                    } else {
                        break;
                    }
                }

                const newPoint = rail.getPosition(i);
                const middlePos = lastPoint.lerp(newPoint, 0.5);
                
                const l = lastPoint.distanceTo(newPoint) / 2;

                const dx = newPoint.getX() - lastPoint.getX()
                const dy = newPoint.getY() - lastPoint.getY()
                const dz = newPoint.getZ() - lastPoint.getZ()
                const yaw = Math.atan2(dz, dx)
                const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz))

                if (player.dimension.isChunkLoaded(middlePos))
                {

                    ParticleSystem.layParticle(
                        particleId,
                        middlePos.add(0, 0.03125, 0),
                        {
                            x: Math.cos(pitch) * Math.cos(yaw),
                            y: Math.sin(pitch),
                            z: Math.cos(pitch) * Math.sin(yaw)
                        },
                        {x: width, y: l},
                        color,
                        duration / 2
                    )
                }
    
                lastPoint = newPoint;
            }
        }
    }
}
