import { Long } from "./Math";

export class UUID {

    private readonly mostSigBits: bigint;

    private readonly leastSigBits: bigint;

    private static readonly int64Array = new BigInt64Array(1)

    public constructor(mostSigBits: bigint, leastSigBits: bigint) {
        this.mostSigBits = UUID.int64Array.fill(mostSigBits)[0];
        this.leastSigBits = UUID.int64Array.fill(leastSigBits)[0];
    }

    public getLeastSignificantBits(): bigint {
        return this.leastSigBits;
    }

    public getMostSignificantBits() {
        return this.mostSigBits;
    }

    public toString(): string {
        const buf: string[] = new Array(36);
        buf[8] = '-';
        buf[13] = '-';
        buf[18] = '-';
        buf[23] = '-';

        const msbHigh = this.mostSigBits >> 32n;
        buf[0] = this.hexChar(msbHigh >> 28n); 
        buf[1] = this.hexChar(msbHigh >> 24n);
        buf[2] = this.hexChar(msbHigh >> 20n); 
        buf[3] = this.hexChar(msbHigh >> 16n);
        buf[4] = this.hexChar(msbHigh >> 12n); 
        buf[5] = this.hexChar(msbHigh >> 8n);
        buf[6] = this.hexChar(msbHigh >> 4n);  
        buf[7] = this.hexChar(msbHigh);

        const msbMid = (this.mostSigBits >> 16n) & 0xFFFFn;
        buf[9] = this.hexChar(msbMid >> 12n); 
        buf[10] = this.hexChar(msbMid >> 8n);
        buf[11] = this.hexChar(msbMid >> 4n);  
        buf[12] = this.hexChar(msbMid);

        const msbLow = this.mostSigBits & 0xFFFFn;
        buf[14] = this.hexChar(msbLow >> 12n); 
        buf[15] = this.hexChar(msbLow >> 8n);
        buf[16] = this.hexChar(msbLow >> 4n);  
        buf[17] = this.hexChar(msbLow);

        const lsbHigh = this.leastSigBits >> 48n;
        buf[19] = this.hexChar(lsbHigh >> 12n); 
        buf[20] = this.hexChar(lsbHigh >> 8n);
        buf[21] = this.hexChar(lsbHigh >> 4n);  
        buf[22] = this.hexChar(lsbHigh);

        const lsbLow = this.leastSigBits & 0xFFFFFFFFFFFFn;
        buf[24] = this.hexChar(lsbLow >> 44n); 
        buf[25] = this.hexChar(lsbLow >> 40n);
        buf[26] = this.hexChar(lsbLow >> 36n); 
        buf[27] = this.hexChar(lsbLow >> 32n);
        buf[28] = this.hexChar(lsbLow >> 28n); 
        buf[29] = this.hexChar(lsbLow >> 24n);
        buf[30] = this.hexChar(lsbLow >> 20n); 
        buf[31] = this.hexChar(lsbLow >> 16n);
        buf[32] = this.hexChar(lsbLow >> 12n); 
        buf[33] = this.hexChar(lsbLow >> 8n);
        buf[34] = this.hexChar(lsbLow >> 4n);  
        buf[35] = this.hexChar(lsbLow);

        return buf.join('');
    }

    private hexChar(val: bigint): string {
        const num = Number(val & 0xFn);
        return num.toString(16);
    }

    public static fromString(name: string): UUID {
        if (name.length === 36) {
            const ch1 = name.charAt(8);
            const ch2 = name.charAt(13);
            const ch3 = name.charAt(18);
            const ch4 = name.charAt(23);
            
            if (ch1 === '-' && ch2 === '-' && ch3 === '-' && ch4 === '-') {
                const msb1 = UUID.parse4Nibbles(name, 0);
                const msb2 = UUID.parse4Nibbles(name, 4);
                const msb3 = UUID.parse4Nibbles(name, 9);
                const msb4 = UUID.parse4Nibbles(name, 14);
                const lsb1 = UUID.parse4Nibbles(name, 19);
                const lsb2 = UUID.parse4Nibbles(name, 24);
                const lsb3 = UUID.parse4Nibbles(name, 28);
                const lsb4 = UUID.parse4Nibbles(name, 32);
                
                if (msb1 >= 0 && msb2 >= 0 && msb3 >= 0 && msb4 >= 0 && 
                    lsb1 >= 0 && lsb2 >= 0 && lsb3 >= 0 && lsb4 >= 0) {
                    const mostSigBits = (msb1 << 48n) | (msb2 << 32n) | (msb3 << 16n) | msb4;
                    const leastSigBits = (lsb1 << 48n) | (lsb2 << 32n) | (lsb3 << 16n) | lsb4;
                    return new UUID(mostSigBits, leastSigBits);
                }
            }
        }
        return UUID.fromString1(name);
    }

    private static parse4Nibbles(name: string, offset: number): bigint {
        let result = 0n;
        for (let i = 0; i < 4; i++) {
            const c = name.charCodeAt(offset + i);
            let nibble = -1;
            
            if (c >= 48 && c <= 57) { // '0'-'9'
                nibble = c - 48;
            } else if (c >= 97 && c <= 102) { // 'a'-'f'
                nibble = c - 87;
            } else if (c >= 65 && c <= 70) { // 'A'-'F'
                nibble = c - 55;
            }
            
            if (nibble < 0) return -1n;
            result = (result << 4n) | BigInt(nibble);
        }
        return result;
    }

    private static fromString1(name: string): UUID {
        const len = name.length;
        if (len > 36) {
            throw new Error("UUID string too large");
        }

        const dash1 = name.indexOf('-');
        const dash2 = name.indexOf('-', dash1 + 1);
        const dash3 = name.indexOf('-', dash2 + 1);
        const dash4 = name.indexOf('-', dash3 + 1);
        const dash5 = name.indexOf('-', dash4 + 1);

        if (dash4 < 0 || dash5 >= 0) {
            throw new Error(`Invalid UUID string: ${name}`);
        }

        let mostSigBits = BigInt(parseInt(name.substring(0, dash1), 16)) & 0xFFFFFFFFn;
        mostSigBits <<= 16n;
        mostSigBits |= BigInt(parseInt(name.substring(dash1 + 1, dash2), 16)) & 0xFFFFn;
        mostSigBits <<= 16n;
        mostSigBits |= BigInt(parseInt(name.substring(dash2 + 1, dash3), 16)) & 0xFFFFn;

        let leastSigBits = BigInt(parseInt(name.substring(dash3 + 1, dash4), 16)) & 0xFFFFn;
        leastSigBits <<= 48n;
        leastSigBits |= BigInt(parseInt(name.substring(dash4 + 1, len), 16)) & 0xFFFFFFFFFFFFn;

        return new UUID(mostSigBits, leastSigBits);
    }

    public equals(obj: UUID): boolean {
        const id = obj as UUID;
        return (this.mostSigBits == id.mostSigBits &&
                this.leastSigBits == id.leastSigBits);
    }

    public compareTo(val: UUID): number {
        const mostSigBits = Long.compare(this.mostSigBits, val.mostSigBits);
        return mostSigBits != 0 ? mostSigBits : Long.compare(this.leastSigBits, val.leastSigBits);
    }
}