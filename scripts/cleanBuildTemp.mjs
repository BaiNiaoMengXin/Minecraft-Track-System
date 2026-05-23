import * as fs from 'fs'
import * as path from 'path'
import * as Constants from './Constants.mjs'

if (fs.existsSync(Constants.BP_BuildPath)) {
    console.log('Remove last BP built cache files');
    fs.rmSync(Constants.BP_BuildPath, { recursive: true, force: true });
}
if (fs.existsSync(Constants.RP_BuildPath)) {
    console.log('Remove last RP built cache files');
    fs.rmSync(Constants.RP_BuildPath, { recursive: true, force: true });
}
if (fs.existsSync("./build")) {
    const files = fs.readdirSync("./build", { withFileTypes: true })
        .filter(item => !item.isDirectory());
    files.forEach(file => {
        if (file.name.includes(".mcaddon")) {
            console.log('Remove last packed mcaddon file');
            fs.rmSync(path.join("./build", file.name))
        }
    })
}