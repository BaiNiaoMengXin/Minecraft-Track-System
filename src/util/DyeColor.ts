import { MaterialColor } from "./MaterialColor";

export class DyeColor {

    private static readonly $VALUES: Array<DyeColor> = [];

    public static readonly WHITE = new DyeColor(MaterialColor.SNOW);
    public static readonly ORANGE = new DyeColor(MaterialColor.COLOR_ORANGE);
    public static readonly MAGENTA = new DyeColor(MaterialColor.COLOR_MAGENTA);
    public static readonly LIGHT_BLUE = new DyeColor(MaterialColor.COLOR_LIGHT_BLUE);
    public static readonly YELLOW = new DyeColor(MaterialColor.COLOR_YELLOW);
    public static readonly LIME = new DyeColor(MaterialColor.COLOR_LIGHT_GREEN);
    public static readonly PINK = new DyeColor(MaterialColor.COLOR_PINK);
    public static readonly GRAY = new DyeColor(MaterialColor.COLOR_GRAY);
    public static readonly LIGHT_GRAY = new DyeColor(MaterialColor.COLOR_LIGHT_GRAY);
    public static readonly CYAN = new DyeColor(MaterialColor.COLOR_CYAN);
    public static readonly PURPLE = new DyeColor(MaterialColor.COLOR_PURPLE);
    public static readonly BLUE = new DyeColor(MaterialColor.COLOR_BLUE);
    public static readonly BROWN = new DyeColor(MaterialColor.COLOR_BROWN);
    public static readonly GREEN = new DyeColor(MaterialColor.COLOR_GREEN);
    public static readonly RED = new DyeColor(MaterialColor.COLOR_RED);
    public static readonly BLACK = new DyeColor(MaterialColor.COLOR_BLACK);

    public readonly materialColor: MaterialColor

    private constructor(materialColor: MaterialColor) {
        this.materialColor = materialColor;

        DyeColor.$VALUES.push(this);
    }

    public ordinal(): number {
        return DyeColor.$VALUES.findIndex(v => v == this);
    }

    public static values(): ReadonlyArray<DyeColor> {
        return DyeColor.$VALUES;
    }
}