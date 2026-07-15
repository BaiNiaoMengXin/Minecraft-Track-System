import { MolangVariableMap, Player, Vector3, world } from "@minecraft/server";
import { getNearestPlayer, rgbHexToColor } from "data/Base";
import { Rail } from "data/Rail";
import { RailType } from "data/RailType";
import { ParticleSystem, particleType } from "rail/ParticleSystem";
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
        const maxRenderDistance = player ? Math.max(player.clientSystemInfo.maxRenderDistance - 2, 1) * 16 : -1;
        const railLength = rail.getLength();

        if (rail.railType == RailType.NONE) {
            // TODO Render "one_way_rail_arrow"
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
}