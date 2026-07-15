import { MolangVariableMap, RGBA, system, Vector2, Vector3, world } from '@minecraft/server';

export enum particleType {
    blue_flame_particle = "minecraft:blue_flame_particle",
    candle_flame_particle = "minecraft:candle_flame_particle",

    show = "mts:show",
    show2 = "mts:show2",
    zero = "mts:zero",
    one = "mts:one",
    two = "mts:two",
    three = "mts:three",
    four = "mts:four",
    five = "mts:six",
    six = "mts:six",
    seven = "mts:seven",
    eight = "mts:eight",
    nine = "mts:nine",
    rail_preview_left = "mts:rail_preview_left",
    rail_preview_right = "mts:rail_preview_right"
}

export abstract class ParticleSystem {

    static layParticle(type: particleType, pos: Vector3, rot: Vector3, size: Vector2, color: RGBA, lifeTime?: number) {
        const molang = new MolangVariableMap();
        molang.setVector3("variable.rot", rot);
        molang.setColorRGBA("variable.color", color);
        molang.setFloat("variable.width", size.x);
        molang.setFloat("variable.length", size.y);

        if (lifeTime)   molang.setFloat("variable.particle_lifetime", lifeTime)

        const dimension = world.getDimension('overworld');

        try {
            dimension.spawnParticle(type, pos, molang);
        } catch (error) {
        }
    }

    static layNumberlayParticle(number: number, pos: Vector3, rot: Vector3, size: Vector2, color: RGBA, lifeTime?: number) {
        let offset = 0;
        for (const element of this.getTypeByNumbers(number)) {
            const molang = new MolangVariableMap();
            molang.setVector3("variable.rot", rot);
            molang.setColorRGBA("variable.color", color);
            molang.setFloat("variable.width", size.x);
            molang.setFloat("variable.length", size.y);

            if (lifeTime)   molang.setFloat("variable.particle_lifetime", lifeTime)

            const dimension = world.getDimension('overworld');

            try {
                dimension.spawnParticle(element, {x: pos.x + offset, y: pos.y, z: pos.z}, molang);
            } catch (error) { 
            }

            offset += 1;
        }
    }

    static getTypeByNumbers(numbers: number): particleType[] {
        const types: particleType[] = [];

        function getDigitFromRight(num: number, position: number): number {
            // 取绝对值，转为整数
            const absNum = Math.abs(Math.floor(num));
            
            // 计算该位的数字
            const divisor = Math.pow(10, position - 1);
            return Math.floor(absNum / divisor) % 10;
        }

        function getDigitCount(num: number): number {
            if (num === 0) return 1;  // 0 是 1 位数
            
            const absNum = Math.abs(Math.floor(num));  // 取绝对值整数
            return Math.floor(Math.log10(absNum)) + 1;
        }

        for (let index = 0; index < getDigitCount(numbers); index++) {
            const element = getDigitFromRight(numbers, index + 1);
            
            types.push(this.getTypeByNumber(element));
        }
        
        return types;
    }

    static getTypeByNumber(number: number): particleType {
        if (number > 9) {
            console.error();
        }

        switch (number) {
            case 0: return particleType.zero;
            case 1: return particleType.one;
            case 2: return particleType.two;
            case 3: return particleType.three;
            case 4: return particleType.four;
            case 5: return particleType.five;
            case 6: return particleType.six;
            case 7: return particleType.seven;
            case 8: return particleType.eight;
            case 9: return particleType.nine;
            default: return particleType.show;
        }
    }
}
